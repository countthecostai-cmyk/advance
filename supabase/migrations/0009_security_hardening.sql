-- Security hardening from the Supabase Security Advisor (2026-10-21).
-- NOT YET APPLIED to the live database (waiting on owner's OK).
--
-- 1. write_audit_log / daily_send_count / recompute_campaign_progress are
--    SECURITY DEFINER and callable by any signed-in user through the API.
--    Before this, a user could write audit entries under someone else's id,
--    read anyone's daily send count, or recompute anyone's campaign. They now
--    only act on the caller's own data unless called with the server's
--    service-role key (Shortcut webhooks, opt-out links, contacts import).
create or replace function is_trusted_server()
returns boolean language sql stable set search_path = public as $$
  -- auth.role() is the role in the caller's JWT ('service_role' for the
  -- server's key). current_user can't be used here: inside a SECURITY
  -- DEFINER function it is always the function owner. session_user covers
  -- direct database sessions (SQL editor, migrations).
  select coalesce(auth.role(), '') = 'service_role'
      or session_user in ('postgres', 'supabase_admin');
$$;

create or replace function write_audit_log(
  p_user_id uuid, p_actor text, p_action text, p_entity_type text, p_entity_id uuid, p_metadata jsonb
)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_trusted_server() and p_user_id is distinct from auth.uid() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  insert into audit_logs (user_id, actor, action, entity_type, entity_id, metadata)
  values (p_user_id, p_actor, p_action, p_entity_type, p_entity_id, coalesce(p_metadata, '{}'::jsonb));
end;
$$;

create or replace function daily_send_count(p_user_id uuid)
returns integer language plpgsql security definer set search_path = public stable as $$
begin
  if not is_trusted_server() and p_user_id is distinct from auth.uid() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  return (
    select coalesce(count(*), 0)::integer
    from campaign_recipients cr
    join campaigns c on c.id = cr.campaign_id
    where cr.user_id = p_user_id
      and cr.status = 'handed_to_messages'
      and c.is_test_mode = false
      and cr.processed_at > now() - interval '24 hours'
  );
end;
$$;

create or replace function recompute_campaign_progress(p_campaign_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_total integer; v_processed integer; v_errors integer; v_skipped integer; v_terminal integer;
  v_status text; v_owner uuid;
begin
  select status, user_id into v_status, v_owner from campaigns where id = p_campaign_id;
  if not is_trusted_server() and v_owner is distinct from auth.uid() then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  select count(*) into v_total from campaign_recipients where campaign_id = p_campaign_id;
  select count(*) into v_processed from campaign_recipients where campaign_id = p_campaign_id and status = 'handed_to_messages';
  select count(*) into v_errors from campaign_recipients where campaign_id = p_campaign_id and status = 'error';
  select count(*) into v_skipped from campaign_recipients where campaign_id = p_campaign_id and status in ('skipped_suppressed', 'skipped_invalid');
  select count(*) into v_terminal from campaign_recipients where campaign_id = p_campaign_id
    and status in ('handed_to_messages', 'error', 'skipped_suppressed', 'skipped_invalid', 'stopped');

  update campaigns set
    recipient_count = v_total,
    processed_count = v_processed,
    error_count = v_errors,
    skipped_count = v_skipped,
    completed_at = case when v_terminal >= v_total and v_total > 0 and v_status not in ('stopped', 'completed') then now() else completed_at end,
    status = case when v_status = 'stopped' then 'stopped' when v_terminal >= v_total and v_total > 0 then 'completed' else v_status end
  where id = p_campaign_id;
end;
$$;

-- 2. The new-user trigger function should never be called directly.
revoke execute on function handle_new_user() from public, anon, authenticated;

-- 3. Organizations are now created server-side (service role) in
--    POST /api/community/organizations, so drop the insert-anything policy.
drop policy if exists "organizations_insert_any" on organizations;

-- 4. Pin search_path on the remaining helper functions.
alter function set_updated_at() set search_path = public;
alter function enforce_group_member_ownership() set search_path = public;
alter function is_group_member(uuid) set search_path = public;
alter function is_group_leader(uuid) set search_path = public;
alter function is_org_admin(uuid) set search_path = public;
alter function is_org_member(uuid) set search_path = public;
