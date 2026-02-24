-- Auto-create Admin employee for the first user who signs up
-- This ensures the first user gets full access without manual intervention

create or replace function handle_first_user()
returns trigger as $$
declare
  admin_role_id uuid;
  employee_count int;
begin
  select count(*) into employee_count from public.employees;

  if employee_count = 0 then
    select id into admin_role_id from public.roles where name = 'Admin' limit 1;

    if admin_role_id is not null then
      insert into public.employees (auth_id, full_name, email, role_id, is_active)
      values (
        new.id,
        coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
        new.email,
        admin_role_id,
        true
      );
    end if;
  end if;

  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_first_user();
