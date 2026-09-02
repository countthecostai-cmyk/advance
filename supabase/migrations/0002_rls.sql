-- Row Level Security. Every table a normal authenticated user can reach is
-- scoped to auth.uid(). Server-side routes that must cross this boundary
-- (the Shortcut webhook endpoints, which authenticate via a signed token
-- instead of a Supabase session) use the service-role client deliberately
-- and re-check ownership in application code — see src/lib/supabase/server.ts
-- and src/app/api/shortcut/**.

alter table profiles enable row level security;
alter table contact_groups enable row level security;
alter table contacts enable row level security;
alter table contact_group_members enable row level security;
alter table suppression_list enable row level security;
alter table consents enable row level security;
alter table campaigns enable row level security;
alter table campaign_recipients enable row level security;
alter table messages enable row level security;
alter table shortcut_sessions enable row level security;
alter table audit_logs enable row level security;

-- profiles: a user can only ever see/edit their own row.
create policy "profiles_select_own" on profiles for select using (id = auth.uid());
create policy "profiles_insert_own" on profiles for insert with check (id = auth.uid());
create policy "profiles_update_own" on profiles for update using (id = auth.uid()) with check (id = auth.uid());
-- No delete policy: profiles are removed only via the auth.users cascade.

-- contact_groups
create policy "groups_select_own" on contact_groups for select using (user_id = auth.uid());
create policy "groups_insert_own" on contact_groups for insert with check (user_id = auth.uid());
create policy "groups_update_own" on contact_groups for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "groups_delete_own" on contact_groups for delete using (user_id = auth.uid());

-- contacts
create policy "contacts_select_own" on contacts for select using (user_id = auth.uid());
create policy "contacts_insert_own" on contacts for insert with check (user_id = auth.uid());
create policy "contacts_update_own" on contacts for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "contacts_delete_own" on contacts for delete using (user_id = auth.uid());

-- contact_group_members
-- Includes an UPDATE policy even though membership rows have nothing
-- meaningful to change on conflict: Postgres requires an UPDATE policy for
-- the `ON CONFLICT ... DO UPDATE` path taken by `.upsert()` (used when
-- importing a CSV with overlapping group assignments) to succeed at all —
-- without one, RLS silently rejects the whole upsert, conflict or not.
create policy "cgm_select_own" on contact_group_members for select using (user_id = auth.uid());
create policy "cgm_insert_own" on contact_group_members for insert with check (user_id = auth.uid());
create policy "cgm_update_own" on contact_group_members for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "cgm_delete_own" on contact_group_members for delete using (user_id = auth.uid());

-- suppression_list
-- UPDATE policy is required for the same `ON CONFLICT DO UPDATE` reason as
-- above — re-suppressing an already-suppressed number (e.g. opt-out link
-- tapped twice, or a different reason recorded) goes through `.upsert()`.
-- Suppression entries are otherwise never silently deleted through the app
-- (re-subscribing a suppressed number is an explicit, logged action — see
-- docs/COMPLIANCE.md); the delete policy exists only for account owners
-- correcting a mistaken entry.
create policy "suppression_select_own" on suppression_list for select using (user_id = auth.uid());
create policy "suppression_insert_own" on suppression_list for insert with check (user_id = auth.uid());
create policy "suppression_update_own" on suppression_list for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "suppression_delete_own" on suppression_list for delete using (user_id = auth.uid());

-- consents
create policy "consents_select_own" on consents for select using (user_id = auth.uid());
create policy "consents_insert_own" on consents for insert with check (user_id = auth.uid());

-- campaigns
create policy "campaigns_select_own" on campaigns for select using (user_id = auth.uid());
create policy "campaigns_insert_own" on campaigns for insert with check (user_id = auth.uid());
create policy "campaigns_update_own" on campaigns for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "campaigns_delete_own" on campaigns for delete using (user_id = auth.uid());

-- campaign_recipients
create policy "cr_select_own" on campaign_recipients for select using (user_id = auth.uid());
create policy "cr_insert_own" on campaign_recipients for insert with check (user_id = auth.uid());
create policy "cr_update_own" on campaign_recipients for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "cr_delete_own" on campaign_recipients for delete using (user_id = auth.uid());

-- messages
create policy "messages_select_own" on messages for select using (user_id = auth.uid());
create policy "messages_insert_own" on messages for insert with check (user_id = auth.uid());

-- shortcut_sessions — a user may view their own sessions (Settings ->
-- "connected Shortcut sessions") but never the token hash matters for
-- server-side verification only, which uses the service-role key anyway.
create policy "shortcut_sessions_select_own" on shortcut_sessions for select using (user_id = auth.uid());
create policy "shortcut_sessions_insert_own" on shortcut_sessions for insert with check (user_id = auth.uid());
create policy "shortcut_sessions_update_own" on shortcut_sessions for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- audit_logs — read-only from the client; all writes go through
-- server-side code using the service-role key so entries can't be forged
-- or deleted by the account they describe.
create policy "audit_select_own" on audit_logs for select using (user_id = auth.uid());
