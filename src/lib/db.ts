import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Create client even with empty values - will fail gracefully at runtime if vars are missing
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default supabase;
