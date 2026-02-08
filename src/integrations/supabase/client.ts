import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Custom storage that safely handles SSR (no localStorage/sessionStorage on server)
const customStorage = {
  getItem: (key: string) => {
    if (typeof window === 'undefined') return null;
    return globalThis.localStorage.getItem(key);
  },
  setItem: (key: string, value: string) => {
    if (typeof window === 'undefined') return;
    globalThis.localStorage.setItem(key, value);
  },
  removeItem: (key: string) => {
    if (typeof window === 'undefined') return;
    globalThis.localStorage.removeItem(key);
  },
};

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL!, SUPABASE_PUBLISHABLE_KEY!, {
  auth: {
    storage: customStorage,
    persistSession: true,
    autoRefreshToken: typeof window !== 'undefined',
  }
});
