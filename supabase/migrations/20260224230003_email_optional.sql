-- Make employee email optional (employees are added manually, no sign-up required)
alter table employees alter column email drop not null;
alter table employees drop constraint employees_email_key;
