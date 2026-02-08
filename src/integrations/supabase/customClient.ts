/**
 * Custom Supabase client wrapper that uses dynamic storage
 * based on "remember me" preference
 */
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { customAuthStorage } from '@/lib/authStorage';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

/**
 * Supabase client with custom storage that respects "remember me" preference
 * - When remember_me = true: uses localStorage (persistent across browser restarts)
 * - When remember_me = false: uses sessionStorage (cleared on browser close)
 */
export const supabaseWithCustomStorage = createClient<Database>(
  SUPABASE_URL, 
  SUPABASE_PUBLISHABLE_KEY, 
  {
    auth: {
      storage: customAuthStorage,
      persistSession: true,
      autoRefreshToken: true,
    }
  }
);
