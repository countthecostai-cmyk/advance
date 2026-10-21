-- Scheduled sending: the person's iPhone runs a Shortcut automation on a timer,
-- which calls /api/shortcut/due/<token> to pick up campaigns whose scheduled_at
-- has passed. schedule_nonce lets the person revoke that link (reset it);
-- schedule_last_checked_at lets Settings show "your phone last checked 2h ago".
alter table profiles add column if not exists schedule_nonce text;
alter table profiles add column if not exists schedule_last_checked_at timestamptz;
