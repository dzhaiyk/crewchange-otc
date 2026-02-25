-- Add system_key column to roles for stable authorization checks.
-- Role names become freely editable display labels; system_key is immutable.

ALTER TABLE roles ADD COLUMN system_key text UNIQUE;

UPDATE roles SET system_key = 'admin'   WHERE name = 'Admin'   AND is_system_role = true;
UPDATE roles SET system_key = 'manager' WHERE name = 'Manager' AND is_system_role = true;
UPDATE roles SET system_key = 'dd'      WHERE name = 'DD'      AND is_system_role = true;
UPDATE roles SET system_key = 'mwd'     WHERE name = 'MWD'     AND is_system_role = true;

-- ============================================================
-- NEW HELPER: get_user_system_key()
-- Returns the system_key for the current auth user's role.
-- ============================================================

CREATE OR REPLACE FUNCTION get_user_system_key()
RETURNS text AS $$
  SELECT r.system_key
  FROM employees e
  JOIN roles r ON r.id = e.role_id
  WHERE e.auth_id = auth.uid()
  LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ============================================================
-- DROP old RLS policies that use get_user_role_name()
-- ============================================================

-- drill_ships
DROP POLICY IF EXISTS "drill_ships_admin_insert" ON drill_ships;
DROP POLICY IF EXISTS "drill_ships_admin_update" ON drill_ships;
DROP POLICY IF EXISTS "drill_ships_admin_delete" ON drill_ships;

-- roles
DROP POLICY IF EXISTS "roles_admin_insert" ON roles;
DROP POLICY IF EXISTS "roles_admin_update" ON roles;
DROP POLICY IF EXISTS "roles_admin_delete" ON roles;

-- employees
DROP POLICY IF EXISTS "employees_admin_insert" ON employees;
DROP POLICY IF EXISTS "employees_admin_update" ON employees;
DROP POLICY IF EXISTS "employees_admin_delete" ON employees;

-- crew_changes
DROP POLICY IF EXISTS "crew_changes_write" ON crew_changes;
DROP POLICY IF EXISTS "crew_changes_update" ON crew_changes;
DROP POLICY IF EXISTS "crew_changes_delete" ON crew_changes;

-- crew_change_entries
DROP POLICY IF EXISTS "crew_change_entries_write" ON crew_change_entries;
DROP POLICY IF EXISTS "crew_change_entries_update" ON crew_change_entries;
DROP POLICY IF EXISTS "crew_change_entries_delete" ON crew_change_entries;

-- schedule_requests
DROP POLICY IF EXISTS "schedule_requests_select" ON schedule_requests;
DROP POLICY IF EXISTS "schedule_requests_insert" ON schedule_requests;
DROP POLICY IF EXISTS "schedule_requests_update" ON schedule_requests;

-- day_balances
DROP POLICY IF EXISTS "day_balances_write" ON day_balances;

-- activity_log
DROP POLICY IF EXISTS "activity_log_select" ON activity_log;

-- ============================================================
-- RECREATE policies using get_user_system_key()
-- ============================================================

-- DRILL SHIPS
CREATE POLICY "drill_ships_admin_insert" ON drill_ships
  FOR INSERT TO authenticated WITH CHECK (get_user_system_key() = 'admin');

CREATE POLICY "drill_ships_admin_update" ON drill_ships
  FOR UPDATE TO authenticated USING (get_user_system_key() = 'admin');

CREATE POLICY "drill_ships_admin_delete" ON drill_ships
  FOR DELETE TO authenticated USING (get_user_system_key() = 'admin');

-- ROLES
CREATE POLICY "roles_admin_insert" ON roles
  FOR INSERT TO authenticated WITH CHECK (get_user_system_key() = 'admin');

CREATE POLICY "roles_admin_update" ON roles
  FOR UPDATE TO authenticated USING (get_user_system_key() = 'admin');

CREATE POLICY "roles_admin_delete" ON roles
  FOR DELETE TO authenticated USING (get_user_system_key() = 'admin');

-- EMPLOYEES
CREATE POLICY "employees_admin_insert" ON employees
  FOR INSERT TO authenticated WITH CHECK (
    get_user_system_key() IN ('admin', 'manager')
  );

CREATE POLICY "employees_admin_update" ON employees
  FOR UPDATE TO authenticated USING (
    get_user_system_key() IN ('admin', 'manager')
  );

CREATE POLICY "employees_admin_delete" ON employees
  FOR DELETE TO authenticated USING (get_user_system_key() = 'admin');

-- CREW CHANGES
CREATE POLICY "crew_changes_write" ON crew_changes
  FOR INSERT TO authenticated WITH CHECK (
    get_user_system_key() IN ('admin', 'manager')
  );

CREATE POLICY "crew_changes_update" ON crew_changes
  FOR UPDATE TO authenticated USING (
    get_user_system_key() IN ('admin', 'manager')
  );

CREATE POLICY "crew_changes_delete" ON crew_changes
  FOR DELETE TO authenticated USING (get_user_system_key() = 'admin');

-- CREW CHANGE ENTRIES
CREATE POLICY "crew_change_entries_write" ON crew_change_entries
  FOR INSERT TO authenticated WITH CHECK (
    get_user_system_key() IN ('admin', 'manager')
  );

CREATE POLICY "crew_change_entries_update" ON crew_change_entries
  FOR UPDATE TO authenticated USING (
    get_user_system_key() IN ('admin', 'manager')
  );

CREATE POLICY "crew_change_entries_delete" ON crew_change_entries
  FOR DELETE TO authenticated USING (get_user_system_key() = 'admin');

-- SCHEDULE REQUESTS
CREATE POLICY "schedule_requests_select" ON schedule_requests
  FOR SELECT TO authenticated USING (
    get_user_system_key() IN ('admin', 'manager')
    OR employee_id = get_user_employee_id()
  );

CREATE POLICY "schedule_requests_insert" ON schedule_requests
  FOR INSERT TO authenticated WITH CHECK (
    employee_id = get_user_employee_id()
    OR get_user_system_key() IN ('admin', 'manager')
  );

CREATE POLICY "schedule_requests_update" ON schedule_requests
  FOR UPDATE TO authenticated USING (
    get_user_system_key() IN ('admin', 'manager')
  );

-- DAY BALANCES
CREATE POLICY "day_balances_write" ON day_balances
  FOR INSERT TO authenticated WITH CHECK (
    get_user_system_key() IN ('admin', 'manager')
  );

-- ACTIVITY LOG
CREATE POLICY "activity_log_select" ON activity_log
  FOR SELECT TO authenticated USING (
    get_user_system_key() IN ('admin', 'manager')
  );

-- ============================================================
-- UPDATE auth trigger to use system_key
-- ============================================================

CREATE OR REPLACE FUNCTION handle_first_user()
RETURNS trigger AS $$
DECLARE
  admin_role_id uuid;
  employee_count int;
BEGIN
  SELECT count(*) INTO employee_count FROM public.employees;

  IF employee_count = 0 THEN
    SELECT id INTO admin_role_id FROM public.roles WHERE system_key = 'admin' LIMIT 1;

    IF admin_role_id IS NOT NULL THEN
      INSERT INTO public.employees (auth_id, full_name, email, role_id, is_active)
      VALUES (
        new.id,
        coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
        new.email,
        admin_role_id,
        true
      );
    END IF;
  END IF;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
