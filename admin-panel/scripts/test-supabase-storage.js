const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function run() {
  console.log('Testing Supabase Storage Connection...');
  // 1. List buckets
  const { data: buckets, error: bErr } = await supabaseAdmin.storage.listBuckets();
  console.log('Buckets:', buckets?.map(b => b.name), bErr);

  // 2. Ensure 'documents' bucket exists and is public
  let docBucket = buckets?.find(b => b.name === 'documents');
  if (!docBucket) {
    console.log('Creating documents bucket...');
    const { data: cbData, error: cbErr } = await supabaseAdmin.storage.createBucket('documents', {
      public: true,
      fileSizeLimit: 52428800 // 50MB
    });
    console.log('Created bucket:', cbData, cbErr);
  } else {
    console.log('documents bucket exists! Public:', docBucket.public);
    if (!docBucket.public) {
      await supabaseAdmin.storage.updateBucket('documents', { public: true });
      console.log('Updated documents bucket to public: true');
    }
  }

  // 3. Test upload a dummy test file
  const testBuffer = Buffer.from('Hello Torque Storage ' + new Date().toISOString());
  const { data: upData, error: upErr } = await supabaseAdmin.storage
    .from('documents')
    .upload('test/test_upload.txt', testBuffer, {
      contentType: 'text/plain',
      upsert: true
    });

  console.log('Test Upload Result:', upData, upErr);

  const { data: { publicUrl } } = supabaseAdmin.storage
    .from('documents')
    .getPublicUrl('test/test_upload.txt');

  console.log('Test Public URL:', publicUrl);
}

run().catch(console.error);
