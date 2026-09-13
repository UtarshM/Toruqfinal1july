const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;

const client = new Client({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  console.log('🔍 DIAGNOSING SUPABASE DATABASE STATUS...');
  await client.connect();

  // 1. Check schemas & public tables
  const tablesRes = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name;
  `);
  console.log(`\n1. Public Tables Count: ${tablesRes.rows.length}`);
  console.log('   Tables:', tablesRes.rows.map(r => r.table_name).join(', '));

  // 2. Check auth users
  const authUsersRes = await client.query(`SELECT id, email FROM auth.users ORDER BY email;`);
  console.log(`\n2. Auth Users Count: ${authUsersRes.rows.length}`);
  authUsersRes.rows.forEach(u => console.log(`   - ${u.email} (ID: ${u.id})`));

  // 3. Check public users
  const publicUsersRes = await client.query(`SELECT id, email, "fullName", "roleId" FROM public.users ORDER BY email;`);
  console.log(`\n3. Public Users Count: ${publicUsersRes.rows.length}`);
  publicUsersRes.rows.forEach(u => console.log(`   - ${u.email} (ID: ${u.id}, RoleID: ${u.roleId})`));

  // 4. Check Roles & Permissions
  const rolesRes = await client.query(`SELECT id, name FROM public.roles;`);
  console.log(`\n4. Roles Count: ${rolesRes.rows.length}`);
  rolesRes.rows.forEach(r => console.log(`   - ${r.name} (ID: ${r.id})`));

  // 5. Check Leads & Policies count
  const leadsRes = await client.query(`SELECT count(*) FROM public.leads WHERE "deletedAt" IS NULL AND status != 'Trashed';`);
  console.log(`\n5. Active Leads Count: ${leadsRes.rows[0].count}`);

  // 6. Check Active RLS Policies
  const rlsRes = await client.query(`
    SELECT tablename, policyname, roles, cmd, qual 
    FROM pg_policies 
    WHERE schemaname = 'public' 
    ORDER BY tablename, policyname;
  `);
  console.log(`\n6. Active RLS Policies (${rlsRes.rows.length} policies):`);
  rlsRes.rows.forEach(p => console.log(`   - [${p.tablename}] ${p.policyname} (${p.cmd})`));

  // 7. Check RLS state on tables
  const rlsStateRes = await client.query(`
    SELECT tablename, rowsecurity 
    FROM pg_tables 
    WHERE schemaname = 'public';
  `);
  console.log(`\n7. RLS Enabled State:`);
  rlsStateRes.rows.forEach(t => console.log(`   - ${t.tablename}: RLS=${t.rowsecurity}`));

  // 8. Test simulation as authenticated user role
  console.log('\n8. Testing simulated authenticated user query to public.users...');
  try {
    const adminUser = authUsersRes.rows.find(u => u.email === 'torqueautoadvisor@gmail.com');
    if (adminUser) {
      await client.query(`SET LOCAL SETTINGS "request.jwt.claim.sub" = '${adminUser.id}';`);
      await client.query(`SET LOCAL ROLE authenticated;`);
      const testRes = await client.query(`SELECT id, email, "fullName" FROM public.users LIMIT 1;`);
      console.log('   ✅ Authenticated query succeeded! Returned:', testRes.rows);
    }
  } catch (err) {
    console.error('   ❌ Authenticated query FAILED:', err.message);
  }

  console.log('\n======================================================');
}

main().catch(console.error).finally(() => client.end());
