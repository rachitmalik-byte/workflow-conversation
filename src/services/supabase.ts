import { createClient } from '@supabase/supabase-js';

const envUrl = (import.meta as any).env?.VITE_SUPABASE_URL || '';
const envKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

const storedUrl = localStorage.getItem('relayhq_supabase_url') || '';
const storedKey = localStorage.getItem('relayhq_supabase_key') || '';

// Hardcoded fallback credentials to connect automatically for all users
const defaultUrl = 'https://tybanzuobmksokxhpmhh.supabase.co';
const defaultKey = 'sb_publishable_Ut5XrxQk02pM_WlvVqZwUA_gfOOsiv0';

const supabaseUrl = storedUrl || envUrl || defaultUrl;
const supabaseKey = storedKey || envKey || defaultKey;

// Initialize client only if keys are present
export const supabase = (() => {
  try {
    return supabaseUrl && supabaseKey 
      ? createClient(supabaseUrl, supabaseKey)
      : null;
  } catch (err) {
    console.error('Failed to initialize Supabase client:', err);
    return null;
  }
})();


