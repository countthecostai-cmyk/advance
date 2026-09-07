-- Community/Groups module: churches, Life Groups, and (per the same schema)
-- any org that runs recurring groups — businesses, nonprofits, schools,
-- community clubs. This is a second, independent product surface living in
-- the same account/profile as the mass-texting tool; it does not touch or
-- rename any existing table (contacts/campaigns/messages are untouched).
--
-- Naming note: this module's `groups` table is unrelated to `contact_groups`
-- (which segments SMS contacts for campaigns). The UI keeps them visually and
-- verbally separate — see src/lib/terminology.ts and the "Groups" tab under
-- /community vs the existing "Groups" manager inside Contacts.

alter table profiles add column if not exists avatar_url text;
alter table profiles add column if not exists birthday date;

-- ── Organizations (the church / company / school / nonprofit / club) ──────
create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) > 0),
  slug text unique not null,
  -- Drives UI vocabulary only (see src/lib/terminology.ts) — the schema,
  -- permissions, and automations are identical across every vertical.
  vertical text not null default 'church'
    check (vertical in ('church', 'nonprofit', 'business', 'education', 'community')),
  created_at timestamptz not null default now()
);

-- ── Ministries / departments / programs (sub-division of an org) ─────────
create table ministries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

create index idx_ministries_org on ministries (organization_id);

-- ── Org-level role membership ────────────────────────────────────
create table organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  role text not null default 'member' check (role in ('admin', 'leader', 'member')),
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create index idx_org_members_org on organization_members (organization_id);
create index idx_org_members_user on organization_members (user_id);

-- ── Groups (Life Groups, teams, classes, chapters — see terminology.ts) ───
create table groups (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  ministry_id uuid references ministries (id) on delete set null,
  name text not null check (char_length(trim(name)) > 0),
  description text,
  image_url text,
  group_type text not null default 'life_group',
  meeting_schedule text,
  location text,
  created_by uuid references profiles (id),
  created_at timestamptz not null default now()
);

create index idx_groups_org on groups (organization_id);

create table group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  role text not null default 'member' check (role in ('leader', 'member')),
  joined_at timestamptz not null default now(),
  unique (group_id, user_id)
);

create index idx_group_members_group on group_members (group_id);
create index idx_group_members_user on group_members (user_id);

-- ── Events ───────────────────────────────────────────────────────
create table events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations (id) on delete cascade,
  group_id uuid references groups (id) on delete cascade,
  title text not null check (char_length(trim(title)) > 0),
  description text,
  location text,
  virtual_link text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  rsvp_deadline timestamptz,
  capacity int,
  is_recurring boolean not null default false,
  recurrence_rule text,
  parent_event_id uuid references events (id) on delete cascade,
  created_by uuid references profiles (id),
  created_at timestamptz not null default now()
);

create index idx_events_group on events (group_id);
create index idx_events_org on events (organization_id);
create index idx_events_starts on events (starts_at);

-- ── RSVPs ──────────────────────────────────────────────────────
create table rsvps (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  status text not null default 'no_response'
    check (status in ('going', 'maybe', 'not_going', 'no_response')),
  responded_at timestamptz,
  reminder_count int not null default 0,
  last_reminded_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (event_id, user_id)
);

create index idx_rsvps_event on rsvps (event_id);
create index idx_rsvps_user on rsvps (user_id);

-- ── Attendance ────────────────────────────────────────────────
create table attendance (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events (id) on delete cascade,
  user_id uuid references profiles (id) on delete cascade,
  guest_name text,
  status text not null check (status in ('present', 'absent', 'excused', 'guest')),
  recorded_by uuid references profiles (id),
  recorded_at timestamptz not null default now(),
  unique (event_id, user_id)
);

create index idx_attendance_event on attendance (event_id);

create trigger trg_rsvps_updated_at
  before update on rsvps
  for each row execute function set_updated_at();
