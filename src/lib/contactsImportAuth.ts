import { NextResponse } from 'next/server'
import { createServiceRoleSupabase } from '@/lib/supabase/server'
import { hashContactsImportToken } from '@/lib/tokens'
import type { Profile } from '@/lib/types/database.types'

/**
 * Authenticates a request from the "Add to Advance" contacts-import
 * Shortcut. Like the Sender Shortcut, this has no Supabase session — it
 * authenticates purely with the personal opaque token embedded in the URL
 * the Shortcut was built with. We look the token up by its hash rather than
 * decoding a signed payload, so revoking (regenerating) it from Settings
 * takes effect immediately.
 */
export async function requireContactsImportToken(token: string) {
  if (!token) {
    return { error: NextResponse.json({ error: 'Missing import link token' }, { status: 401 }) } as const
  }

  const supabase = createServiceRoleSupabase()
  const tokenHash = hashContactsImportToken(token)

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('contacts_import_token_hash', tokenHash)
    .maybeSingle()

  if (error || !profile) {
    return {
      error: NextResponse.json(
        { error: 'This import link is no longer valid. Reopen Advance → Settings and get a new one.' },
        { status: 401 }
      ),
    } as const
  }

  return { supabase, profile: profile as Profile } as const
}
