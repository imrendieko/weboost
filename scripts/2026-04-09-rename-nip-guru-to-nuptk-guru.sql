-- Rename guru identity column from nip_guru to nuptk_guru
-- and enforce exactly 16 numeric digits.

begin;

alter table guru
  rename column nip_guru to nuptk_guru;

-- Make sure value is stored as text so leading zeros are preserved.
alter table guru
  alter column nuptk_guru type text using nuptk_guru::text;

alter table guru
  alter column nuptk_guru set not null;

-- Recreate uniqueness with a predictable constraint name.
alter table guru
  drop constraint if exists guru_nip_guru_key;

alter table guru
  drop constraint if exists guru_nuptk_guru_key;

alter table guru
  add constraint guru_nuptk_guru_key unique (nuptk_guru);

-- Reject non-digit values and anything that is not exactly 16 digits.
alter table guru
  drop constraint if exists guru_nuptk_guru_format_check;

alter table guru
  add constraint guru_nuptk_guru_format_check
  check (nuptk_guru ~ '^[0-9]{16}$');

commit;
