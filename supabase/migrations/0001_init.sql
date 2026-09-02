-- Advance: core schema
-- Multi-tenant. Every row that belongs to a user carries user_id = auth.uid() owner.
-- auth.users (Supabase Auth) is the "users" table required by the spec; `profiles`
-- is the 1:1 extension table for app-specific fields.

create extension if not exists "pgcrypto";   -- gen_random_uuid()
create extension if not exists "pg_trgm";    -- fast contact name/phone search

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  -- The user's own iPhone number, in E.164. Used to power Test Mode (send-to-self)
  -- and to tell the user's own number apart if it's ever imported as a contact.
  own_phone_number text check (own_phone_number is null or own_phone_number ~ '^\+[1-9]\d{1,14}$'),
  timezone text not null default 'America/New_York',
  -- Compliance / abuse-prevention limits. Sane per-account defaults; an operator
  -- can raise them per-account by hand (there is deliberately no self-serve UI to
  -- raise your own limits, see docs/COMPLIANCE.md).
  daily_send_cap integer not null default 300,
  max_recipients_per_campaign integer not null default 150,
  min_seconds_between_campaigns integer not null default 60,
  shortcut_configured_at timestamptz,
  test_mode_confirmed_at timestamptz, -- set once the user completes a successful self-test send
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_profiles_updated_at
  before update on profiles
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- contact_groups
-- ---------------------------------------------------------------------------
create table contact_groups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  color text default '#3d60f5',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name)
);

create index idx_contact_groups_user on contact_groups (user_id);

create trigger trg_contact_groups_updated_at
  before update on contact_groups
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- contacts
-- ---------------------------------------------------------------------------
create table contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  first_name text not null check (char_length(trim(first_name)) > 0),
  last_name text not null default '',
  phone_number text not null check (phone_number ~ '^\+[1-9]\d{1,14}$'),
  notes text not null default '',
  -- Current consent snapshot. `consents` below is the append-only history.
  consent_status text not null default 'unknown'
    check (consent_status in ('unknown', 'given', 'implied', 'declined')),
  consent_source text,
  consent_recorded_at timestamptz,
  opted_out boolean not null default false,
  opted_out_at timestamptz,
  opted_out_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, phone_number)
);

create index idx_contacts_user on contacts (user_id);
create index idx_contacts_user_optout on contacts (user_id, opted_out);
create index idx_contacts_search on contacts using gin (
  (lower(first_name || ' ' || last_name || ' ' || phone_number)) gin_trgm_ops
);

create trigger trg_contacts_updated_at
  before update on contacts
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- contact_group_members (join table)
-- user_id is denormalized so RLS policies stay a single equality check and so
-- a trigger can cheaply guarantee contact_id/group_id/user_id are consistent.
-- ---------------------------------------------------------------------------
create table contact_group_members (
  contact_id uuid not null references contacts (id) on delete cascade,
  group_id uuid not null references contact_groups (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (contact_id, group_id)
);

create index idx_cgm_group on contact_group_members (group_id);
create index idx_cgm_user on contact_group_members (user_id);

create or replace function enforce_group_member_ownership()
returns trigger
language plpgsql
as $$
declare
  contact_owner uuid;
  group_owner uuid;
begin
  select user_id into contact_owner from contacts where id = new.contact_id;
  select user_id into group_owner from contact_groups where id = new.group_id;
  if contact_owner is null or group_owner is null then
    raise exception 'contact or group does not exist';
  end if;
  if contact_owner <> group_owner or contact_owner <> new.user_id then
    raise exception 'contact, group, and membership must belong to the same user';
  end if;
  return new;
end;
$$;

create trigger trg_cgm_ownership
  before insert or update on contact_group_members
  for each row execute function enforce_group_member_ownership();

-- ---------------------------------------------------------------------------
-- suppression_list — phone numbers this account must never message again.
-- Checked at recipient-selection time; independent of the `contacts` table so
-- a suppressed number stays suppressed even if re-imported under a new contact.
-- ---------------------------------------------------------------------------
create table suppression_list (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  phone_number text not null check (phone_number ~ '^\+[1-9]\d{1,14}$'),
  reason text not null check (reason in ('stop_reply', 'manual', 'opt_out_link', 'bounced', 'imported')),
  note text,
  created_at timestamptz not null default now(),
  unique (user_id, phone_number)
);

create index idx_suppression_user on suppression_list (user_id);

-- ---------------------------------------------------------------------------
-- consents — append-only audit trail of consent changes for a contact.
-- ---------------------------------------------------------------------------
create table consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  contact_id uuid not null references contacts (id) on delete cascade,
  status text not null check (status in ('given', 'implied', 'declined', 'withdrawn')),
  method text not null default 'manual',
  note text,
  recorded_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index idx_consents_contact on consents (contact_id);
create index idx_consents_user on consents (user_id);

-- ---------------------------------------------------------------------------
-- campaigns
-- ---------------------------------------------------------------------------
create table campaigns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  message_template text not null check (char_length(trim(message_template)) > 0),
  status text not null default 'draft'
    check (status in ('draft', 'ready', 'queued', 'sending', 'paused', 'completed', 'stopped', 'failed')),
  is_test_mode boolean not null default false,
  scheduled_at timestamptz,
  recipient_count integer not null default 0,
  processed_count integer not null default 0,
  error_count integer not null default 0,
  skipped_count integer not null default 0,
  -- Advisory pacing hint handed to the Shortcut; Apple gives us no way to enforce this,
  -- see docs/APPLE_SHORTCUTS.md.
  rate_limit_seconds integer not null default 3 check (rate_limit_seconds >= 1),
  chunk_size integer not null default 20 check (chunk_size between 1 and 50),
  include_opt_out_footer boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz
);

create index idx_campaigns_user on campaigns (user_id, created_at desc);
create index idx_campaigns_user_status on campaigns (user_id, status);

create trigger trg_campaigns_updated_at
  before update on campaigns
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- campaign_recipients — one row per contact queued into a campaign.
-- Snapshots name/phone at queue time so edits to `contacts` afterward never
-- change a message that has already gone out (or is in flight).
-- ---------------------------------------------------------------------------
create table campaign_recipients (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  contact_id uuid references contacts (id) on delete set null,
  phone_number text not null check (phone_number ~ '^\+[1-9]\d{1,14}$'),
  first_name text not null default '',
  last_name text not null default '',
  personalized_message text not null,
  sequence_index integer not null,
  status text not null default 'pending'
    check (status in (
      'pending',            -- queued in our DB, not yet claimed by the Shortcut
      'claimed',            -- fetched by the Shortcut, send in progress
      'handed_to_messages', -- Shortcut's Send Message action ran with no reported error
      'skipped_suppressed', -- excluded at send time (opted out / suppressed after queueing)
      'skipped_invalid',    -- excluded at send time (bad phone number)
      'error',              -- Shortcut reported the Send Message action failed
      'stopped'             -- campaign was stopped before this recipient was reached
    )),
  error_message text,
  claimed_at timestamptz,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (campaign_id, contact_id)
);

create index idx_cr_campaign on campaign_recipients (campaign_id, sequence_index);
create index idx_cr_campaign_status on campaign_recipients (campaign_id, status);
create index idx_cr_user on campaign_recipients (user_id);

-- ---------------------------------------------------------------------------
-- messages — durable send-history log, independent of campaign lifecycle.
-- This is what backs the "Messages" history tab. Status vocabulary is
-- deliberately honest about what Apple lets a third party know, see
-- docs/APPLE_SHORTCUTS.md "Do not fake delivery status".
-- ---------------------------------------------------------------------------
create table messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  campaign_id uuid references campaigns (id) on delete set null,
  campaign_recipient_id uuid references campaign_recipients (id) on delete set null,
  contact_id uuid references contacts (id) on delete set null,
  phone_number text not null,
  body text not null,
  status text not null default 'prepared'
    check (status in ('prepared', 'handed_to_messages', 'failed', 'unknown')),
  handed_to_messages_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_messages_user on messages (user_id, created_at desc);
create index idx_messages_campaign on messages (campaign_id);

-- ---------------------------------------------------------------------------
-- shortcut_sessions — short-lived, single-campaign credentials the Shortcut
-- uses to call back into the API. We never store the raw token, only its hash
-- (see src/lib/shortcutToken.ts), so a leaked database dump doesn't leak
-- usable tokens.
-- ---------------------------------------------------------------------------
create table shortcut_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  campaign_id uuid not null references campaigns (id) on delete cascade,
  token_hash text not null unique,
  status text not null default 'active' check (status in ('active', 'completed', 'expired', 'revoked')),
  expires_at timestamptz not null,
  chunk_offset integer not null default 0,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

create index idx_shortcut_sessions_campaign on shortcut_sessions (campaign_id);
create index idx_shortcut_sessions_user on shortcut_sessions (user_id);

-- ---------------------------------------------------------------------------
-- audit_logs — append-only. Never updated, never deleted by the application.
-- ---------------------------------------------------------------------------
create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  actor text not null default 'user' check (actor in ('user', 'system', 'shortcut')),
  action text not null,
  entity_type text,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index idx_audit_user on audit_logs (user_id, created_at desc);
create index idx_audit_entity on audit_logs (entity_type, entity_id);
