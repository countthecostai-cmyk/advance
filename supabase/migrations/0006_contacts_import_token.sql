-- Lets a person's "Add to Advance" Apple Shortcut (picks contacts straight
-- from the iPhone Contacts app) authenticate without a Supabase session,
-- the same way the Sender Shortcut authenticates with a signed token — but
-- this one isn't tied to a single campaign/run, so it's a long-lived,
-- revocable opaque token instead. Only its sha256 hash is ever stored; see
-- src/lib/tokens.ts (createContactsImportToken) and
-- src/lib/contactsImportAuth.ts.

alter table profiles
  add column contacts_import_token_hash text,
  add column contacts_import_configured_at timestamptz;

-- Partial unique index (not a plain unique constraint) so any number of
-- accounts can simultaneously have no import link configured (null).
create unique index idx_profiles_contacts_import_token_hash
  on profiles (contacts_import_token_hash)
  where contacts_import_token_hash is not null;
