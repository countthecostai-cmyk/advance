-- In-app notifications (RSVP reminders, post-meeting follow-ups) and per-contact
-- notes / commitments / follow-ups that power "Catch Me Up".

create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  kind text not null,
  title text not null,
  body text not null default '',
  link text,
  dedupe_key text unique,
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index idx_notifications_user on notifications (user_id, created_at desc);
alter table notifications enable row level security;
create policy "notifications_select_own" on notifications for select using (user_id = auth.uid());
create policy "notifications_update_own" on notifications for update using (user_id = auth.uid()) with check (user_id = auth.uid());
-- No insert/delete policy: only the server (service role) creates notifications.

create table contact_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  contact_id uuid not null references contacts (id) on delete cascade,
  kind text not null default 'note' check (kind in ('note', 'commitment', 'follow_up')),
  body text not null check (char_length(trim(body)) > 0),
  due_at date,
  done_at timestamptz,
  created_at timestamptz not null default now()
);
create index idx_contact_notes_contact on contact_notes (contact_id, created_at desc);
alter table contact_notes enable row level security;
create policy "contact_notes_select_own" on contact_notes for select using (user_id = auth.uid());
create policy "contact_notes_insert_own" on contact_notes for insert
  with check (user_id = auth.uid() and exists (select 1 from contacts c where c.id = contact_id and c.user_id = auth.uid()));
create policy "contact_notes_update_own" on contact_notes for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "contact_notes_delete_own" on contact_notes for delete using (user_id = auth.uid());
