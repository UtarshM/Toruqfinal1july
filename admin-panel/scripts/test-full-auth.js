const { createClient } = require('@supabase/supabase-js');
const { PrismaClient } = require('@prisma/client');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
const prisma = new PrismaClient();

async function testFullAuthFlow() {
  console.log('1. Signing in as torqueautoadvisor@gmail.com...');
  const { data: signinData, error: signinErr } = await supabase.auth.signInWithPassword({
    email: 'torqueautoadvisor@gmail.com',
    password: 'TorqueAutoAdvisOR09123'
  });

  if (signinErr) {
    console.error('Sign in failed:', signinErr);
    return;
  }

  const token = signinData.session.access_token;
  console.log('✅ Sign in successful. Token obtained.');

  console.log('2. Validating token via supabaseAdmin.auth.getUser(token)...');
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !user) {
    console.error('❌ getUser failed:', authError);
    return;
  }
  console.log('✅ User resolved in Supabase Auth:', user.email, 'ID:', user.id);

  console.log('3. Fetching user profile from Prisma...');
  const profile = await prisma.user.findUnique({
    where: { id: user.id },
    include: {
      role: {
        include: { permissions: true }
      },
      permissions: true
    }
  });

  if (!profile) {
    console.error('❌ User profile not found in Prisma for ID:', user.id);
    return;
  }

  const rolePerms = profile.role?.permissions.map(p => p.name) || [];
  const extraPerms = profile.permissions.map(p => p.name) || [];
  const permissions = Array.from(new Set([...rolePerms, ...extraPerms]));

  console.log('✅ User profile successfully loaded!');
  console.log('Name:', profile.fullName);
  console.log('Role:', profile.role?.name);
  console.log('Total Permissions count:', permissions.length);

  console.log('4. Testing LeaveRequest table in database...');
  const leaveCount = await prisma.leaveRequest.count();
  console.log('✅ LeaveRequest count in DB:', leaveCount);

  console.log('5. Testing Leads table in database...');
  const leadsCount = await prisma.lead.count();
  console.log('✅ Leads count in DB:', leadsCount);

  console.log('\n🎉 ALL DATABASE AND AUTH FLOWS VERIFIED SUCCESSFULLY!');
}

testFullAuthFlow().catch(console.error).finally(() => prisma.$disconnect());
