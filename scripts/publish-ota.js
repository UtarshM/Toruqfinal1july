#!/usr/bin/env node

/**
 * Torque Auto Advisor - OTA Update Publisher
 * 
 * Supports:
 * - Custom update names / messages passed via CLI arguments
 * - Interactive prompt to edit update name before publishing
 * - Preview and Production channels
 * - Automatic update status verification
 */

const { spawn, execSync } = require('child_process');
const readline = require('readline');
const path = require('path');
const fs = require('fs');

const rootDir = path.resolve(__dirname, '..');
const frontendDir = path.resolve(rootDir, 'frontend');

if (!fs.existsSync(frontendDir)) {
  console.error('Error: frontend directory not found at', frontendDir);
  process.exit(1);
}

// Parse args
const rawArgs = process.argv.slice(2);
let channel = 'preview';
let message = '';

for (let i = 0; i < rawArgs.length; i++) {
  const arg = rawArgs[i];
  if (arg === '--channel' || arg === '-c') {
    channel = rawArgs[++i] || 'preview';
  } else if (arg.startsWith('--channel=')) {
    channel = arg.split('=')[1] || 'preview';
  } else if (arg === '--prod' || arg === '--production') {
    channel = 'production';
  } else if (arg === '--preview') {
    channel = 'preview';
  } else if (arg === '--message' || arg === '-m') {
    message = rawArgs[++i] || '';
  } else if (arg.startsWith('--message=')) {
    message = arg.split('=')[1] || '';
  } else if (!arg.startsWith('-') && !message) {
    message = arg;
  }
}

const DEFAULT_MESSAGE = 'Add Profile Name Edit Option & Mobile App Enhancements';

async function promptUpdateName() {
  if (message) return message;

  if (process.stdin.isTTY) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    return new Promise((resolve) => {
      console.log('\n======================================================');
      console.log('🚀 TORQUE AUTO ADVISOR - OVER-THE-AIR (OTA) PUBLISHER');
      console.log('======================================================');
      console.log(`Target Channel: ${channel.toUpperCase()}`);
      console.log(`Default Name:   "${DEFAULT_MESSAGE}"\n`);

      rl.question(`Enter OTA Update Name / Message (press Enter to keep default):\n> `, (answer) => {
        rl.close();
        const finalMsg = answer.trim() || DEFAULT_MESSAGE;
        resolve(finalMsg);
      });
    });
  }

  return DEFAULT_MESSAGE;
}

async function run() {
  const finalMessage = await promptUpdateName();

  console.log('\n------------------------------------------------------');
  console.log(`📦 Publishing OTA Update`);
  console.log(`📌 Update Name: "${finalMessage}"`);
  console.log(`🎯 Channel:     ${channel}`);
  console.log(`📂 Directory:   ${frontendDir}`);
  console.log('------------------------------------------------------\n');

  const easArgs = [
    'eas',
    'update',
    '--channel', channel,
    '--message', finalMessage,
    '--non-interactive',
  ];

  console.log(`> npx ${easArgs.join(' ')}\n`);

  const isWindows = process.platform === 'win32';
  const child = spawn(isWindows ? 'npx.cmd' : 'npx', easArgs, {
    cwd: frontendDir,
    stdio: 'inherit',
    shell: false,
  });

  child.on('close', (code) => {
    if (code === 0) {
      console.log('\n======================================================');
      console.log('✅ OTA UPDATE PUBLISHED SUCCESSFULLY!');
      console.log('======================================================');
      console.log(`All users on APK builds pointing to channel "${channel}" will receive:`);
      console.log(`👉 "${finalMessage}"`);
      console.log('======================================================\n');

      // Show recent status
      try {
        console.log('Fetching latest OTA branch status...\n');
        const listProc = spawn(isWindows ? 'npx.cmd' : 'npx', [
          'eas',
          'update:list',
          '--branch', channel,
          '--limit', '1',
          '--non-interactive',
        ], {
          cwd: frontendDir,
          stdio: 'inherit',
          shell: false,
        });
        listProc.on('close', () => {
          process.exit(0);
        });
      } catch (statusErr) {
        process.exit(0);
      }
    } else {
      console.error(`\n❌ EAS update failed with exit code ${code}`);
      process.exit(code || 1);
    }
  });
}

run().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
