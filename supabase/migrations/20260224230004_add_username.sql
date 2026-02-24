-- Add unique username column for sign-in
alter table employees add column username text unique;

-- Backfill existing employees with lowercase full_name (no spaces)
update employees set username = lower(replace(full_name, ' ', ''));

-- Make it required going forward
alter table employees alter column username set not null;
