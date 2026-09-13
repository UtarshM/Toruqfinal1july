const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;

const client = new Client({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

function splitSqlStatements(sql) {
  const statements = [];
  let current = '';
  let inDollarQuote = false;

  const lines = sql.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('--') && !inDollarQuote) {
      continue; // Skip comment line
    }

    // Toggle dollar quote flag if line contains $$
    const dollarMatches = (line.match(/\$\$/g) || []).length;
    if (dollarMatches % 2 !== 0) {
      inDollarQuote = !inDollarQuote;
    }

    current += line + '\n';

    if (!inDollarQuote && trimmed.endsWith(';')) {
      if (current.trim().length > 0) {
        statements.push(current.trim());
      }
      current = '';
    }
  }

  if (current.trim().length > 0) {
    statements.push(current.trim());
  }

  return statements;
}

async function main() {
  console.log('🚀 Connecting to Supabase PostgreSQL database directly...');
  await client.connect();
  console.log('✅ Connected successfully!');

  const sqlPath = path.join(__dirname, '..', '..', 'master_migration.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  const statements = splitSqlStatements(sql);
  console.log(`Executing ${statements.length} top-level SQL blocks...`);

  let count = 0;
  let successCount = 0;
  let errorCount = 0;

  for (const stmt of statements) {
    count++;
    try {
      await client.query(stmt);
      successCount++;
      if (count % 20 === 0 || count === statements.length) {
        console.log(`Progress: ${count} / ${statements.length} blocks executed...`);
      }
    } catch (err) {
      errorCount++;
      console.error(`❌ Error at block #${count}:`, err.message);
      console.error('Block snippet:', stmt.slice(0, 150).replace(/\n/g, ' '));
    }
  }

  console.log(`\n🎉 MIGRATION FINISHED! ${successCount} blocks succeeded, ${errorCount} failed.`);
}

main().catch(console.error).finally(() => client.end());
