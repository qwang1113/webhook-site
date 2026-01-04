import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export function createBrowserClient() {
  return createClient<Database>(supabaseUrl, supabaseAnonKey);
}

export function createServerClient() {
  if (!supabaseServiceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');
  }
  return createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

let serverClient: SupabaseClient<Database> | null = null;

export function getServerClient(): SupabaseClient<Database> {
  if (!serverClient) {
    serverClient = createServerClient();
  }
  return serverClient;
}
