import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

/**
 * Service-role Supabase client for server-only background work.
 *
 * The Evidence Harvester runs enrichment inside Next's `after()` callback, which is detached from
 * the request and has no auth cookie — so it cannot use the cookie-scoped `createClient()` in
 * lib/supabase/server.ts. This client authenticates with the service-role key and BYPASSES RLS,
 * so any code using it MUST set `user_id` explicitly on every insert to keep rows owner-scoped.
 *
 * NEVER import this from a Client Component. The service-role key has no NEXT_PUBLIC_ prefix and
 * must never reach the browser.
 */
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      'createServiceClient requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.',
    );
  }
  return createSupabaseClient<Database>(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
