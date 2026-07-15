import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// Service-role client. This bypasses Row Level Security entirely,
// so it must NEVER be imported into anything that runs in the
// browser or that a normal user request can reach — only trusted
// server-side jobs like the cron routes under app/api/cron/.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}