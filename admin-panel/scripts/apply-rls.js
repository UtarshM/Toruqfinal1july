const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Initializing RLS policy deployment script...');

  const sqlPath = path.join(__dirname, '..', 'prisma', 'rls_policies.sql');
  if (!fs.existsSync(sqlPath)) {
    console.error(`❌ Error: Could not find sql file at ${sqlPath}`);
    process.exit(1);
  }

  const sqlContent = fs.readFileSync(sqlPath, 'utf8');

  // Split by semicolon, but clean up comments and empty statements
  const rawStatements = sqlContent.split(';');
  
  let executedCount = 0;
  let errorCount = 0;

  for (let statement of rawStatements) {
    // Remove SQL comments (-- comments)
    let cleaned = statement
      .split('\n')
      .map(line => line.split('--')[0])
      .join('\n')
      .trim();

    if (!cleaned) continue;

    try {
      console.log(`\nExecuting:\n${cleaned.substring(0, 100)}${cleaned.length > 100 ? '...' : ''}`);
      await prisma.$executeRawUnsafe(cleaned);
      console.log('✅ Statement executed successfully.');
      executedCount++;
    } catch (error) {
      // If it says policy already exists, that is okay
      if (error.message.includes('already exists')) {
        console.log('⚠️ Policy already exists. Skipping...');
      } else {
        console.error('❌ SQL Execution Error:', error.message);
        errorCount++;
      }
    }
  }

  // Also configure storage buckets since it is part of setup
  try {
    console.log('\n📦 Setting up Supabase Storage configuration...');
    // Create the bucket using raw SQL since storage schema belongs to Supabase
    await prisma.$executeRawUnsafe(`
      INSERT INTO storage.buckets (id, name, public)
      VALUES ('documents', 'documents', true)
      ON CONFLICT (id) DO NOTHING;
    `);
    console.log('✅ Created "documents" storage bucket.');

    await prisma.$executeRawUnsafe(`
      DROP POLICY IF EXISTS "documents: public-read" ON storage.objects;
    `);
    await prisma.$executeRawUnsafe(`
      CREATE POLICY "documents: public-read" ON storage.objects
      FOR SELECT USING (bucket_id = 'documents');
    `);
    console.log('✅ Created read access policy for documents bucket.');

    await prisma.$executeRawUnsafe(`
      DROP POLICY IF EXISTS "documents: anyone-upload" ON storage.objects;
    `);
    await prisma.$executeRawUnsafe(`
      CREATE POLICY "documents: anyone-upload" ON storage.objects
      FOR INSERT WITH CHECK (bucket_id = 'documents');
    `);
    console.log('✅ Created upload access policy for documents bucket.');

  } catch (error) {
    console.warn('⚠️ Storage bucket RLS warning (might require admin API privileges or already exists):', error.message);
  }

  console.log(`\n🎉 RLS Deployment Finished. Executed: ${executedCount}, Errors: ${errorCount}`);
}

main()
  .catch(e => console.error('Fatal error during RLS deployment:', e))
  .finally(() => prisma.$disconnect());
