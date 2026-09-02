// Hand-written types mirroring supabase/migrations/*.sql.
// If you change the schema, update this file in the same commit — run
// `npx supabase gen types typescript` against your live project for the
// authoritative version once deployed, and paste the diff in here.

export type ConsentStatus = 'unknown' | 'given' | 'implied' | 'declined'
export type ConsentEventStatus = 'given' | 'implied' | 'declined' | 'withdrawn'
export type SuppressionReason = 'stop_reply' | 'manual' | 'opt_out_link' | 'bounced' | 'imported'

export type CampaignStatus =
  | 'draft'
  | 'ready'
  | 'queued'
  | 'sending'
  | 'paused'
  | 'completed'
  | 'stopped'
  | 'failed'

export type CampaignRecipientStatus =
  | 'pending'
  | 'claimed'
  | 'handed_to_messages'
  | 'skipped_suppressed'
  | 'skipped_invalid'
  | 'error'
  | 'stopped'

export type MessageStatus = 'prepared' | 'handed_to_messages' | 'failed' | 'unknown'
export type ShortcutSessionStatus = 'active' | 'completed' | 'expired' | 'revoked'
export type AuditActor = 'user' | 'system' | 'shortcut'

// NOTE: these are `type` aliases, not `interface`s, deliberately. Every one
// of them is used as a Row/Insert/Update type in the Database interface
// below, which must structurally satisfy supabase-js's `Record<string,
// unknown>`-constrained generics — an `interface` is not considered
// assignable to an index-signature type in that position (a real TS
// quirk: `type X = {...}` matches `Record<string, unknown>` structurally,
// `interface X {...}` does not), so this file uses `type` throughout.
export type Profile = {
  id: string
  display_name: string | null
  own_phone_number: string | null
  timezone: string
  daily_send_cap: number
  max_recipients_per_campaign: number
  min_seconds_between_campaigns: number
  shortcut_configured_at: string | null
  test_mode_confirmed_at: string | null
  created_at: string
  updated_at: string
}

export type ContactGroup = {
  id: string
  user_id: string
  name: string
  color: string
  created_at: string
  updated_at: string
}

export type Contact = {
  id: string
  user_id: string
  first_name: string
  last_name: string
  phone_number: string
  notes: string
  consent_status: ConsentStatus
  consent_source: string | null
  consent_recorded_at: string | null
  opted_out: boolean
  opted_out_at: string | null
  opted_out_reason: string | null
  created_at: string
  updated_at: string
}

export type ContactWithGroups = Contact & {
  groups: ContactGroup[]
}

export type ContactGroupMember = {
  contact_id: string
  group_id: string
  user_id: string
  created_at: string
}

export type SuppressionEntry = {
  id: string
  user_id: string
  phone_number: string
  reason: SuppressionReason
  note: string | null
  created_at: string
}

export type ConsentEvent = {
  id: string
  user_id: string
  contact_id: string
  status: ConsentEventStatus
  method: string
  note: string | null
  recorded_at: string
  created_at: string
}

export type Campaign = {
  id: string
  user_id: string
  name: string
  message_template: string
  status: CampaignStatus
  is_test_mode: boolean
  scheduled_at: string | null
  recipient_count: number
  processed_count: number
  error_count: number
  skipped_count: number
  rate_limit_seconds: number
  chunk_size: number
  include_opt_out_footer: boolean
  created_at: string
  updated_at: string
  started_at: string | null
  completed_at: string | null
}

export type CampaignRecipient = {
  id: string
  campaign_id: string
  user_id: string
  contact_id: string | null
  phone_number: string
  first_name: string
  last_name: string
  personalized_message: string
  sequence_index: number
  status: CampaignRecipientStatus
  error_message: string | null
  claimed_at: string | null
  processed_at: string | null
  created_at: string
}

export type Message = {
  id: string
  user_id: string
  campaign_id: string | null
  campaign_recipient_id: string | null
  contact_id: string | null
  phone_number: string
  body: string
  status: MessageStatus
  handed_to_messages_at: string | null
  created_at: string
}

export type ShortcutSession = {
  id: string
  user_id: string
  campaign_id: string
  token_hash: string
  status: ShortcutSessionStatus
  expires_at: string
  chunk_offset: number
  created_at: string
  last_used_at: string | null
}

export type AuditLog = {
  id: string
  user_id: string | null
  actor: AuditActor
  action: string
  entity_type: string | null
  entity_id: string | null
  metadata: Record<string, unknown>
  created_at: string
}

// Minimal Database generic so `createClient<Database>()` type-checks table
// access without hand-maintaining Supabase's full generated shape.
//
// `Relationships: []` on every table and the empty `Views`/`Functions` (aside
// from the RPCs we actually call) are required to structurally satisfy
// @supabase/supabase-js's `GenericTable`/`GenericSchema` types — without them
// TS silently widens every Row type to `never`. If you regenerate this file
// with `supabase gen types typescript`, the generated output already
// includes these.
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Partial<Profile> & { id: string }
        Update: Partial<Profile>
        Relationships: []
      }
      contact_groups: {
        Row: ContactGroup
        Insert: Partial<ContactGroup> & { user_id: string; name: string }
        Update: Partial<ContactGroup>
        Relationships: []
      }
      contacts: {
        Row: Contact
        Insert: Partial<Contact> & { user_id: string; first_name: string; phone_number: string }
        Update: Partial<Contact>
        Relationships: []
      }
      contact_group_members: {
        Row: ContactGroupMember
        Insert: Partial<ContactGroupMember> & { contact_id: string; group_id: string; user_id: string }
        Update: Partial<ContactGroupMember>
        Relationships: [
          {
            foreignKeyName: 'contact_group_members_contact_id_fkey'
            columns: ['contact_id']
            isOneToOne: false
            referencedRelation: 'contacts'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'contact_group_members_group_id_fkey'
            columns: ['group_id']
            isOneToOne: false
            referencedRelation: 'contact_groups'
            referencedColumns: ['id']
          },
        ]
      }
      suppression_list: {
        Row: SuppressionEntry
        Insert: Partial<SuppressionEntry> & { user_id: string; phone_number: string; reason: SuppressionReason }
        Update: Partial<SuppressionEntry>
        Relationships: []
      }
      consents: {
        Row: ConsentEvent
        Insert: Partial<ConsentEvent> & { user_id: string; contact_id: string; status: ConsentEventStatus }
        Update: Partial<ConsentEvent>
        Relationships: []
      }
      campaigns: {
        Row: Campaign
        Insert: Partial<Campaign> & { user_id: string; name: string; message_template: string }
        Update: Partial<Campaign>
        Relationships: []
      }
      campaign_recipients: {
        Row: CampaignRecipient
        Insert: Partial<CampaignRecipient> & {
          campaign_id: string
          user_id: string
          phone_number: string
          personalized_message: string
          sequence_index: number
        }
        Update: Partial<CampaignRecipient>
        Relationships: []
      }
      messages: {
        Row: Message
        Insert: Partial<Message> & { user_id: string; phone_number: string; body: string }
        Update: Partial<Message>
        Relationships: [
          {
            foreignKeyName: 'messages_campaign_id_fkey'
            columns: ['campaign_id']
            isOneToOne: false
            referencedRelation: 'campaigns'
            referencedColumns: ['id']
          },
        ]
      }
      shortcut_sessions: {
        Row: ShortcutSession
        Insert: Partial<ShortcutSession> & {
          user_id: string
          campaign_id: string
          token_hash: string
          expires_at: string
        }
        Update: Partial<ShortcutSession>
        Relationships: []
      }
      audit_logs: {
        Row: AuditLog
        Insert: Partial<AuditLog> & { action: string }
        Update: Partial<AuditLog>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      daily_send_count: { Args: { p_user_id: string }; Returns: number }
      recompute_campaign_progress: { Args: { p_campaign_id: string }; Returns: undefined }
      write_audit_log: {
        Args: {
          p_user_id: string | null
          p_actor: string
          p_action: string
          p_entity_type: string | null
          p_entity_id: string | null
          p_metadata: Record<string, unknown>
        }
        Returns: undefined
      }
    }
  }
}
