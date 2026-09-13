const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(url, anonKey);

async function main() {
  console.log('🧪 Testing Supabase Authenticated Access...');

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'torqueautoadvisor@gmail.com',
    password: 'Perin@3623'
  });

  if (authError) {
    console.error('❌ Login Error:', authError.message);
    return;
  }

  console.log('✅ Logged in successfully as:', authData.user.email);

  const tablesToTest = [
    'users',
    'roles',
    'permissions',
    'leads',
    'policies',
    'customers',
    'quotations',
    'notifications',
    'system_settings',
    'predefined_responses',
    'addons',
    'rate_tables'
  ];

  for (const table of tablesToTest) {
    const { data, error } = await supabase.from(table).select('*').limit(1);
    if (error) {
      console.error(`❌ Query [${table}] FAILED:`, error.message, `(Code: ${error.code})`);
    } else {
      console.log(`✅ Query [${table}] SUCCESS: Returned ${data.length} row(s)`);
    }
  }
}

main();
