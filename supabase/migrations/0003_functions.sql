-- Helper functions used by the application layer (called via supabase-js .rpc()),
-- plus the auth.users -> profiles bootstrap trigger.

-- Every new Supabase Auth user gets a profiles row automatically so the app
-- never has to special-case "profile doesn't exist yet".
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Recomputes a campaign's rollup counters from its recipients and flips
-- status to 'completed' once every recipient has reached a terminal state.
-- Called by the Shortcut progress/complete webhooks and by pause/resume/stop.
create or replace function recompute_campaign_progress(p_campaign_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_total integer;
  v_processed integer; -- handed_to_messages
  v_errors integer;
  v_skipped integer;
  v_terminal integer;
  v_status text;
begin
  select count(*) into v_total from campaign_recipients where campaign_id = p_campaign_id;
  select count(*) into v_processed from campaign_recipients
    where campaign_id = p_campaign_id and status = 'handed_to_messages';
  select count(*) into v_errors from campaign_recipients
    where campaign_id = p_campaign_id and status = 'error';
  select count(*) into v_skipped from campaign_recipients
    where campaign_id = p_campaign_id and status in ('skipped_suppressed', 'skipped_invalid');
  select count(*) into v_terminal from campaign_recipients
    where campaign_id = p_campaign_id
      and status in ('handed_to_messages', 'error', 'skipped_suppressed', 'skipped_invalid', 'stopped');

  select status into v_status from campaigns where id = p_campaign_id;

  update campaigns
  set
    recipient_count = v_total,
    processed_count = v_processed,
    error_count = v_errors,
    skipped_count = v_skipped,
    completed_at = case
      when v_terminal >= v_total and v_total > 0 and v_status not in ('stopped', 'completed')
        then now()
      else completed_at
    end,
    status = case
      when v_status = 'stopped' then 'stopped'
      when v_terminal >= v_total and v_total > 0 then 'completed'
      else v_status
    end
  where id = p_campaign_id;
end;
$$;

-- How many recipients this account has actually handed to Messages (across all
-- campaigns) in the last 24 hours. Used to enforce profiles.daily_send_cap
-- before a new campaign is allowed to start. Test-mode sends don't count.
create or replace function daily_send_count(p_user_id uuid)
returns integer
language sql
security definer set search_path = public
stable
as $$
  select coalesce(count(*), 0)::integer
  from campaign_recipients cr
  join campaigns c on c.id = cr.campaign_id
  where cr.user_id = p_user_id
    and cr.status = 'handed_to_messages'
    and c.is_test_mode = false
    and cr.processed_at > now() - interval '24 hours';
$$;

-- Convenience insert used by every server route so audit entries always have
-- a consistent shape. SECURITY DEFINER because normal users only have SELECT
-- on audit_logs (writes must go through server code, never the client).
create or replace function write_audit_log(
  p_user_id uuid,
  p_actor text,
  p_action text,
  p_entity_type text,
  p_entity_id uuid,
  p_metadata jsonb
)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  insert into audit_logs (user_id, actor, action, entity_type, entity_id, metadata)
  values (p_user_id, p_actor, p_action, p_entity_type, p_entity_id, coalesce(p_metadata, '{}'::jsonb));
end;
$$;
