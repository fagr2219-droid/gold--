import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://gjotewcbhsxanhxpouhh.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdqb3Rld2NiaHN4YW5oeHBvdWhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY3MzE4NTgsImV4cCI6MjEwMjMwNzg1OH0.ejTmvyHph4sggyEVvfBc2UhKp50KSUPpKTFvirgW2s0';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
