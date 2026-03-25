import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error('Missing Supabase URL');
}

if (!supabaseServiceRole) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY is not set!');
  console.error('Add it to your .env.local file:');
  console.error('SUPABASE_SERVICE_ROLE_KEY=your-service-role-key');
  // Fallback to anon key with warning
  console.warn('⚠️ Falling back to anon key - RLS policies will apply');
}

// Service role client - bypasses RLS, use only in API routes (server-side)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRole || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export default supabaseAdmin;
