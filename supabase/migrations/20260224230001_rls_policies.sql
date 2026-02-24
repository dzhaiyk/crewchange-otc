-- CrewChange RLS Policies
-- Role-based access control via Supabase Auth

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- Get the employee record for the current auth user
create or replace function get_user_employee_id()
returns uuid as $$
  select id from employees where auth_id = auth.uid() limit 1;
$$ language sql stable security definer;

-- Get the role name for the current auth user
create or replace function get_user_role_name()
returns text as $$
  select r.name
  from employees e
  join roles r on r.id = e.role_id
  where e.auth_id = auth.uid()
  limit 1;
$$ language sql stable security definer;

-- Get the drill ship id for the current auth user
create or replace function get_user_drill_ship_id()
returns uuid as $$
  select drill_ship_id from employees where auth_id = auth.uid() limit 1;
$$ language sql stable security definer;

-- ============================================================
-- ENABLE RLS
-- ============================================================
alter table drill_ships enable row level security;
alter table roles enable row level security;
alter table employees enable row level security;
alter table crew_changes enable row level security;
alter table crew_change_entries enable row level security;
alter table schedule_requests enable row level security;
alter table day_balances enable row level security;
alter table activity_log enable row level security;

-- ============================================================
-- DRILL SHIPS POLICIES
-- ============================================================
create policy "drill_ships_select" on drill_ships
  for select to authenticated using (true);

create policy "drill_ships_admin_insert" on drill_ships
  for insert to authenticated with check (get_user_role_name() = 'Admin');

create policy "drill_ships_admin_update" on drill_ships
  for update to authenticated using (get_user_role_name() = 'Admin');

create policy "drill_ships_admin_delete" on drill_ships
  for delete to authenticated using (get_user_role_name() = 'Admin');

-- ============================================================
-- ROLES POLICIES
-- ============================================================
create policy "roles_select" on roles
  for select to authenticated using (true);

create policy "roles_admin_insert" on roles
  for insert to authenticated with check (get_user_role_name() = 'Admin');

create policy "roles_admin_update" on roles
  for update to authenticated using (get_user_role_name() = 'Admin');

create policy "roles_admin_delete" on roles
  for delete to authenticated using (get_user_role_name() = 'Admin');

-- ============================================================
-- EMPLOYEES POLICIES
-- ============================================================
create policy "employees_select" on employees
  for select to authenticated using (true);

create policy "employees_admin_insert" on employees
  for insert to authenticated with check (
    get_user_role_name() in ('Admin', 'Manager')
  );

create policy "employees_admin_update" on employees
  for update to authenticated using (
    get_user_role_name() in ('Admin', 'Manager')
  );

create policy "employees_admin_delete" on employees
  for delete to authenticated using (get_user_role_name() = 'Admin');

-- ============================================================
-- CREW CHANGES POLICIES
-- ============================================================
create policy "crew_changes_select" on crew_changes
  for select to authenticated using (true);

create policy "crew_changes_write" on crew_changes
  for insert to authenticated with check (
    get_user_role_name() in ('Admin', 'Manager')
  );

create policy "crew_changes_update" on crew_changes
  for update to authenticated using (
    get_user_role_name() in ('Admin', 'Manager')
  );

create policy "crew_changes_delete" on crew_changes
  for delete to authenticated using (get_user_role_name() = 'Admin');

-- ============================================================
-- CREW CHANGE ENTRIES POLICIES
-- ============================================================
create policy "crew_change_entries_select" on crew_change_entries
  for select to authenticated using (true);

create policy "crew_change_entries_write" on crew_change_entries
  for insert to authenticated with check (
    get_user_role_name() in ('Admin', 'Manager')
  );

create policy "crew_change_entries_update" on crew_change_entries
  for update to authenticated using (
    get_user_role_name() in ('Admin', 'Manager')
  );

create policy "crew_change_entries_delete" on crew_change_entries
  for delete to authenticated using (get_user_role_name() = 'Admin');

-- ============================================================
-- SCHEDULE REQUESTS POLICIES
-- ============================================================
create policy "schedule_requests_select" on schedule_requests
  for select to authenticated using (
    get_user_role_name() in ('Admin', 'Manager')
    or employee_id = get_user_employee_id()
  );

create policy "schedule_requests_insert" on schedule_requests
  for insert to authenticated with check (
    employee_id = get_user_employee_id()
    or get_user_role_name() in ('Admin', 'Manager')
  );

create policy "schedule_requests_update" on schedule_requests
  for update to authenticated using (
    get_user_role_name() in ('Admin', 'Manager')
  );

-- ============================================================
-- DAY BALANCES POLICIES
-- ============================================================
create policy "day_balances_select" on day_balances
  for select to authenticated using (true);

create policy "day_balances_write" on day_balances
  for insert to authenticated with check (
    get_user_role_name() in ('Admin', 'Manager')
  );

-- ============================================================
-- ACTIVITY LOG POLICIES
-- ============================================================
create policy "activity_log_select" on activity_log
  for select to authenticated using (
    get_user_role_name() in ('Admin', 'Manager')
  );

create policy "activity_log_insert" on activity_log
  for insert to authenticated with check (true);
