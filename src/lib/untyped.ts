import type { SupabaseClient } from '@supabase/supabase-js'

// Tables added after the generated types (notifications, contact_notes) are
// reached through this loosely-typed view of the client.
export function untyped(client: unknown): SupabaseClient<any, 'public', any> {
  return client as SupabaseClient<any, 'public', any>
}
