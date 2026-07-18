const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables manually
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
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  console.log('Testing authentication with admin@torque.com / Admin@Torque2026...');
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'admin@torque.com',
    password: 'Admin@Torque2026'
  });

  if (error) {
    console.error('❌ Login failed:', error.message);
    return;
  }

  console.log('✅ Login succeeded!');
  console.log('Session access token length:', data.session.access_token.length);

  // Now, let's call the /api/v1/auth/me API running on Vercel to check if it responds!
  const axios = require('axios');
  const vercelUrl = 'https://admin-panel-delta-steel.vercel.app/api/v1/auth/me';
  
  try {
    console.log(`Sending GET request to live API: ${vercelUrl}`);
    const response = await axios.get(vercelUrl, {
      headers: {
        'Authorization': `Bearer ${data.session.access_token}`
      }
    });
    console.log('✅ API Response Status:', response.status);
    console.log('API Response Data:', JSON.stringify(response.data, null, 2));
  } catch (apiError) {
    console.error('❌ API request failed:', apiError.response ? apiError.response.status : apiError.message);
    if (apiError.response) {
      console.error('Error Response data:', apiError.response.data);
    }
  }

  // Let's also check the onboarding check-form-status API
  const onboardingUrl = 'https://admin-panel-delta-steel.vercel.app/api/v1/onboarding/check-form-status';
  try {
    console.log(`Sending GET request to live API: ${onboardingUrl}`);
    const response = await axios.get(onboardingUrl, {
      headers: {
        'Authorization': `Bearer ${data.session.access_token}`
      }
    });
    console.log('✅ Onboarding API Response Status:', response.status);
    console.log('Onboarding API Response Data:', JSON.stringify(response.data, null, 2));
  } catch (apiError) {
    console.error('❌ Onboarding API request failed:', apiError.response ? apiError.response.status : apiError.message);
    if (apiError.response) {
      console.error('Error Response data:', apiError.response.data);
    }
  }
}

test();
