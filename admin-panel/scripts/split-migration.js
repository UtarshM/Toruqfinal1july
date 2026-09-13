const fs = require('fs');
const path = require('path');

const inputPath = path.join(__dirname, '..', '..', 'master_migration.sql');
const part1Path = path.join(__dirname, '..', '..', 'master_migration_part1_schema_and_policies.sql');
const part2Path = path.join(__dirname, '..', '..', 'master_migration_part2_leads_data.sql');

if (!fs.existsSync(inputPath)) {
  console.error('Input file not found');
  process.exit(1);
}

const content = fs.readFileSync(inputPath, 'utf8');
const lines = content.split('\n');

let part1Lines = [];
let part2Lines = [];

let inLeadsData = false;

for (const line of lines) {
  if (line.includes('-- Table "public"."leads":')) {
    inLeadsData = true;
    part1Lines.push('-- [Leads Data moved to master_migration_part2_leads_data.sql]');
  }

  if (inLeadsData) {
    part2Lines.push(line);
    if (line.includes('ON CONFLICT DO NOTHING;')) {
      inLeadsData = false;
    }
  } else {
    part1Lines.push(line);
  }
}

fs.writeFileSync(part1Path, part1Lines.join('\n'), 'utf8');
fs.writeFileSync(part2Path, part2Lines.join('\n'), 'utf8');

console.log('✅ Split complete!');
console.log('Part 1 (Schema, Auth, Policies):', (fs.statSync(part1Path).size / 1024).toFixed(2), 'KB');
console.log('Part 2 (Leads Data):', (fs.statSync(part2Path).size / 1024 / 1024).toFixed(2), 'MB');
