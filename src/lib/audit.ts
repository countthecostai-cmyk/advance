import type { AppSupabaseClient } from '@/lib/supabase/server'
import type { AuditActor, Database } from '@/lib/types/database.types'

export async function logAudit(
  supabase: AppSupabaseClient,
  params: {
    userId: string | null
    actor: AuditActor
    action: string
    entityType?: string
    entityId?: string
    metadata?: Record<string, unknown>
  }
): Promise<void> {
  // Best-effort: an audit log failure should never block the underlying
  // action (e.g. don't fail a contact delete because logging hiccuped), but
  // we do surface it to server logs so it's not silently lost.
  const { error } = await supabase.rpc('write_audit_log', {
    p_user_id: params.userId,
    p_actor: params.actor,
    p_action: params.action,
    p_entity_type: params.entityType ?? null,
    p_entity_id: params.entityId ?? null,
    p_metadata: params.metadata ?? {},
  })
  if (error) {
    console.error('audit log write failed', params.action, error.message)
  }
}
