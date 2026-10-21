-- groups.created_by, events.created_by and attendance.recorded_by referenced
-- profiles with no ON DELETE rule, so deleting a person's account failed
-- with "Database error deleting user" once they had created a group/event
-- or recorded attendance. Make those links clear themselves instead.
-- (DELETE /api/account also clears them in code, so this is belt-and-braces.)
alter table groups drop constraint if exists groups_created_by_fkey;
alter table groups add constraint groups_created_by_fkey
  foreign key (created_by) references profiles (id) on delete set null;

alter table events drop constraint if exists events_created_by_fkey;
alter table events add constraint events_created_by_fkey
  foreign key (created_by) references profiles (id) on delete set null;

alter table attendance drop constraint if exists attendance_recorded_by_fkey;
alter table attendance add constraint attendance_recorded_by_fkey
  foreign key (recorded_by) references profiles (id) on delete set null;
