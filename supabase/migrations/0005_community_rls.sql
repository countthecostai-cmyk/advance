-- Community/Groups module RLS.
-- Principle (same as the rest of Advance): people only see orgs/groups/events
-- they belong to. Org admins manage their org but never get automatic access
-- to anything private outside this module (and never to the mass-texting
-- tables — those already have their own user_id-scoped RLS from 0002).

alter table organizations enable row level security;
alter table ministries enable row level security;
alter table organization_members enable row level security;
alter table groups enable row level security;
alter table group_members enable row level security;
alter table events enable row level security;
alter table rsvps enable row level security;
alter table attendance enable row level security;

create or replace function is_org_admin(org_id uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from organization_members
    where organization_id = org_id and user_id = auth.uid() and role = 'admin'
  );
$$;

create or replace function is_org_member(org_id uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from organization_members
    where organization_id = org_id and user_id = auth.uid()
  );
$$;

create or replace function is_group_member(gid uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from group_members where group_id = gid and user_id = auth.uid()
  );
$$;

create or replace function is_group_leader(gid uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from group_members where group_id = gid and user_id = auth.uid() and role = 'leader'
  );
$$;

-- profiles: additive policy alongside the existing "own row only" policies
-- from 0002 — people who share an organization can see each other's basic
-- profile (name/photo), the same way group_members already lets group-mates
-- see each other. Postgres OR's multiple permissive SELECT policies together,
-- so this only adds visibility, it never narrows the existing one.
create policy "profiles_select_orgmates" on profiles for select
  using (exists (
    select 1 from organization_members m1
    join organization_members m2 on m1.organization_id = m2.organization_id
    where m1.user_id = auth.uid() and m2.user_id = profiles.id
  ));

create policy "organizations_select_members" on organizations for select
  using (is_org_member(id));
create policy "organizations_insert_any" on organizations for insert with check (true);
create policy "organizations_update_admin" on organizations for update using (is_org_admin(id));

create policy "org_members_select" on organization_members for select
  using (is_org_member(organization_id));
create policy "org_members_admin_manage" on organization_members for all
  using (is_org_admin(organization_id)) with check (is_org_admin(organization_id));
create policy "org_members_self_join" on organization_members for insert
  with check (user_id = auth.uid());

create policy "ministries_select" on ministries for select using (is_org_member(organization_id));
create policy "ministries_admin_write" on ministries for all
  using (is_org_admin(organization_id)) with check (is_org_admin(organization_id));

create policy "groups_select_orgmates" on groups for select using (is_org_member(organization_id));
create policy "groups_admin_manage" on groups for all
  using (is_org_admin(organization_id)) with check (is_org_admin(organization_id));
create policy "groups_leader_update" on groups for update using (is_group_leader(id));

create policy "group_members_select" on group_members for select
  using (is_group_member(group_id) or is_org_admin((select organization_id from groups where id = group_id)));
create policy "group_members_leader_manage" on group_members for all
  using (is_group_leader(group_id) or is_org_admin((select organization_id from groups where id = group_id)))
  with check (is_group_leader(group_id) or is_org_admin((select organization_id from groups where id = group_id)));
create policy "group_members_self_join" on group_members for insert
  with check (user_id = auth.uid());

create policy "events_select" on events for select
  using ((group_id is null and is_org_member(organization_id)) or is_group_member(group_id));
create policy "events_leader_manage" on events for all
  using (is_group_leader(group_id) or is_org_admin(organization_id))
  with check (is_group_leader(group_id) or is_org_admin(organization_id));

create policy "rsvps_select_groupmates" on rsvps for select
  using (exists (select 1 from events e where e.id = event_id and (is_group_member(e.group_id) or is_org_admin(e.organization_id))));
create policy "rsvps_self_insert" on rsvps for insert with check (user_id = auth.uid());
create policy "rsvps_self_update" on rsvps for update using (user_id = auth.uid());

create policy "attendance_select_groupmates" on attendance for select
  using (exists (select 1 from events e where e.id = event_id and (is_group_member(e.group_id) or is_org_admin(e.organization_id))));
create policy "attendance_leader_manage" on attendance for all
  using (exists (select 1 from events e where e.id = event_id and (is_group_leader(e.group_id) or is_org_admin(e.organization_id))))
  with check (exists (select 1 from events e where e.id = event_id and (is_group_leader(e.group_id) or is_org_admin(e.organization_id))));
