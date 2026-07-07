const { PrismaClient } = require('@prisma/client');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Manually load .env since we're running raw node
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.\-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || '';
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.substring(1, value.length - 1);
      } else if (value.startsWith("'") && value.endsWith("'")) {
        value = value.substring(1, value.length - 1);
      }
      process.env[key] = value;
    }
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not found in .env');
  process.exit(1);
}

const prisma = new PrismaClient();
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const USERS_TO_CREATE = [
  {
    email: 'admin@torque.com',
    password: 'Admin@Torque2026',
    fullName: 'Torque Admin',
    roleName: 'Super Admin'
  },
  {
    email: 'sales@torque.com',
    password: 'Sales@Torque2026',
    fullName: 'Torque Sales',
    roleName: 'Sales Executive'
  },
  {
    email: 'hr@torque.com',
    password: 'HR@Torque2026',
    fullName: 'Torque HR',
    roleName: 'HR Manager'
  }
];

async function main() {
  console.log('🚀 Initializing live user creation script...');

  for (const userData of USERS_TO_CREATE) {
    console.log(`\nCreating account for ${userData.fullName} (${userData.email}) with role "${userData.roleName}"...`);

    // Find the role in the database
    const role = await prisma.role.findFirst({
      where: { name: userData.roleName }
    });

    if (!role) {
      console.error(`❌ Error: Role "${userData.roleName}" not found in database. Run seed first.`);
      continue;
    }

    // 1. Create user in Supabase Auth
    // Use admin client to bypass email confirmation
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: userData.email,
      password: userData.password,
      email_confirm: true,
      user_metadata: { full_name: userData.fullName }
    });

    if (authError) {
      // If user already exists in auth, check if they are in public.users
      if (authError.message.includes('already exists') || authError.status === 422) {
        console.log(`⚠️ User already exists in Supabase Auth. Trying to fetch existing auth user...`);
        const { data: listData, error: listError } = await supabase.auth.admin.listUsers();
        if (listError) {
          console.error(`❌ Failed to list users:`, listError.message);
          continue;
        }
        const existingAuthUser = listData.users.find(u => u.email === userData.email);
        if (!existingAuthUser) {
          console.error(`❌ User already exists but could not find them in list.`);
          continue;
        }
        
        // Upsert profile in database
        const user = await prisma.user.upsert({
          where: { id: existingAuthUser.id },
          update: {
            email: userData.email,
            fullName: userData.fullName,
            roleId: role.id,
            isActive: true // Force active so they can log in
          },
          create: {
            id: existingAuthUser.id,
            email: userData.email,
            fullName: userData.fullName,
            roleId: role.id,
            isActive: true
          }
        });
        console.log(`✅ Profile successfully created/updated in Prisma: ID = ${user.id}`);
      } else {
        console.error(`❌ Supabase Auth creation failed:`, authError.message);
      }
      continue;
    }

    // 2. Create profile row in public.users table
    const user = await prisma.user.upsert({
      where: { id: authData.user.id },
      update: {
        email: userData.email,
        fullName: userData.fullName,
        roleId: role.id,
        isActive: true // Force active so they can log in
      },
      create: {
        id: authData.user.id,
        email: userData.email,
        fullName: userData.fullName,
        roleId: role.id,
        isActive: true
      }
    });

    console.log(`✅ Account successfully created:`);
    console.log(`   - Email: ${userData.email}`);
    console.log(`   - Password: ${userData.password}`);
    console.log(`   - User ID: ${user.id}`);
  }

  console.log('\n🎉 Finished live user creation.');
}

main()
  .catch(e => console.error('Error during live user creation:', e))
  .finally(() => prisma.$disconnect());
