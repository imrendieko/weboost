#!/usr/bin/env node
/**
 * Build script that ensures Supabase env vars are available during Next.js build
 * This allows pages to properly prerender with Supabase client initialization
 */

const fs = require('fs');
const path = require('path');

// Ensure env vars are loaded
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('=== Build Configuration ===');
console.log('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓ Set' : '✗ Missing');
console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseKey ? '✓ Set' : '✗ Missing');

// If env vars exist, log them for debugging (safe - they're public keys)
if (supabaseUrl && supabaseKey) {
  console.log(`Supabase URL: ${supabaseUrl}`);
  console.log(`Build will proceed with Supabase client available`);
} else {
  console.warn('Warning: Supabase env vars may not be fully configured');
}

console.log('=== Starting Next.js Build ===\n');

// Run the actual build
const { exec } = require('child_process');
exec('next build', (error, stdout, stderr) => {
  if (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
  console.log(stdout);
  if (stderr) console.error(stderr);
  process.exit(0);
});
