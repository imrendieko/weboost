import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

let supabase: any = null;

// Initialize Supabase client safely
// Can be called at build time with empty string values without throwing
try {
  if (supabaseUrl && supabaseAnonKey) {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
  } else {
    // During build, create a dummy/null client that won't throw
    // At runtime in Vercel, env vars will be populated and client will work
    supabase = null;
  }
} catch (error) {
  console.error('Failed to initialize Supabase client:', error);
  supabase = null;
}

// Helper to get client safely at runtime
export function getSupabaseClient() {
  if (!supabase && supabaseUrl && supabaseAnonKey) {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
  }
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }
  return supabase;
}

// Export client - will be null during build, properly initialized at runtime
export default supabase || {
  // Fallback stub to prevent null reference errors during build
  from: () => ({ select: () => Promise.resolve({ data: null, error: null }) }),
};
