import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://gjotewcbhsxanhxpouhh.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseAnonKey) {
  console.error('⚠️ VITE_SUPABASE_ANON_KEY is missing! Add it to .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
