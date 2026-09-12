const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkOrSetPassword() {
  const adminEmail = 'torqueautoadvisor@gmail.com';
  const newPassword = 'TorqueAutoAdvisOR09123';

  console.log(`Setting password for ${adminEmail} to: ${newPassword}...`);

  const { data: users, error: listErr } = await supabase.auth.admin.listUsers();
  if (listErr) {
    console.error('Failed to list users:', listErr);
    return;
  }

  const adminUser = users.users.find(u => u.email.toLowerCase() === adminEmail.toLowerCase());
  if (!adminUser) {
    console.error(`User ${adminEmail} not found!`);
    return;
  }

  const { data, error } = await supabase.auth.admin.updateUserById(adminUser.id, {
    password: newPassword,
    email_confirm: true
  });

  if (error) {
    console.error('❌ Failed to update password:', error);
  } else {
    console.log('✅ Password successfully set for', adminEmail);
  }

  // Also test signing in with that password
  const clientSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  const { data: loginData, error: loginError } = await clientSupabase.auth.signInWithPassword({
    email: adminEmail,
    password: newPassword
  });

  if (loginError) {
    console.error('❌ Login verification failed:', loginError.message);
  } else {
    console.log('✅ Login verified successfully! Access token generated.');
  }
}

checkOrSetPassword();
