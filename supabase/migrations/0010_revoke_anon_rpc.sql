-- Applied to production 2026-10-21.
-- write_audit_log / daily_send_count / recompute_campaign_progress are only
-- ever called by signed-in users (their own data) or by the server with the
-- service-role key. Signed-out (anon) callers have no reason to reach them;
-- with p_user_id = null an anon caller could otherwise insert blank audit rows.
revoke execute on function write_audit_log(uuid, text, text, text, uuid, jsonb) from public, anon;
revoke execute on function daily_send_count(uuid) from public, anon;
revoke execute on function recompute_campaign_progress(uuid) from public, anon;
