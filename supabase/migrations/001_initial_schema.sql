-- CrewChange Phase 1 Schema
-- Multi-ship crew rotation management

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- ============================================================
-- DRILL SHIPS
-- ============================================================
create table drill_ships (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  helicopter_day integer not null default 4 check (helicopter_day between 0 and 6),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column drill_ships.helicopter_day is '0=Sunday, 1=Monday, ... 6=Saturday. Default 4=Thursday';

-- ============================================================
-- ROLES
-- ============================================================
create table roles (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  description text,
  is_system_role boolean not null default false,
  is_field_role boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- EMPLOYEES
-- ============================================================
create table employees (
  id uuid primary key default uuid_generate_v4(),
  auth_id uuid unique references auth.users(id) on delete set null,
  full_name text not null,
  email text not null unique,
  phone text,
  role_id uuid not null references roles(id) on delete restrict,
  drill_ship_id uuid references drill_ships(id) on delete set null,
  shift text check (shift in ('day', 'night')),
  is_onboard boolean not null default false,
  rotation_start_date date,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- CREW CHANGES
-- ============================================================
create table crew_changes (
  id uuid primary key default uuid_generate_v4(),
  drill_ship_id uuid not null references drill_ships(id) on delete cascade,
  scheduled_date date not null,
  status text not null default 'planned' check (status in ('planned', 'confirmed', 'completed', 'cancelled')),
  notes text,
  created_by uuid references employees(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- CREW CHANGE ENTRIES
-- ============================================================
create table crew_change_entries (
  id uuid primary key default uuid_generate_v4(),
  crew_change_id uuid not null references crew_changes(id) on delete cascade,
  outgoing_employee_id uuid references employees(id) on delete set null,
  incoming_employee_id uuid references employees(id) on delete set null,
  role_id uuid not null references roles(id) on delete restrict,
  shift text check (shift in ('day', 'night')),
  is_early boolean not null default false,
  is_late boolean not null default false,
  days_delta integer not null default 0,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'completed', 'cancelled')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- SCHEDULE REQUESTS
-- ============================================================
create table schedule_requests (
  id uuid primary key default uuid_generate_v4(),
  employee_id uuid not null references employees(id) on delete cascade,
  drill_ship_id uuid not null references drill_ships(id) on delete cascade,
  original_date date not null,
  requested_date date not null,
  reason text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'denied')),
  reviewed_by uuid references employees(id) on delete set null,
  has_conflict boolean not null default false,
  conflict_details text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- DAY BALANCES
-- ============================================================
create table day_balances (
  id uuid primary key default uuid_generate_v4(),
  employee_id uuid not null references employees(id) on delete cascade,
  crew_change_entry_id uuid references crew_change_entries(id) on delete set null,
  days_amount integer not null,
  reason text not null,
  created_at timestamptz not null default now()
);

-- ============================================================
-- ACTIVITY LOG
-- ============================================================
create table activity_log (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references employees(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  details jsonb,
  created_at timestamptz not null default now()
);

-- ============================================================
-- INDEXES
-- ============================================================
create index idx_employees_role on employees(role_id);
create index idx_employees_ship on employees(drill_ship_id);
create index idx_employees_auth on employees(auth_id);
create index idx_crew_changes_ship on crew_changes(drill_ship_id);
create index idx_crew_changes_date on crew_changes(scheduled_date);
create index idx_crew_change_entries_change on crew_change_entries(crew_change_id);
create index idx_schedule_requests_employee on schedule_requests(employee_id);
create index idx_schedule_requests_ship on schedule_requests(drill_ship_id);
create index idx_day_balances_employee on day_balances(employee_id);
create index idx_activity_log_entity on activity_log(entity_type, entity_id);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_drill_ships_updated_at before update on drill_ships
  for each row execute function update_updated_at();
create trigger trg_roles_updated_at before update on roles
  for each row execute function update_updated_at();
create trigger trg_employees_updated_at before update on employees
  for each row execute function update_updated_at();
create trigger trg_crew_changes_updated_at before update on crew_changes
  for each row execute function update_updated_at();
create trigger trg_crew_change_entries_updated_at before update on crew_change_entries
  for each row execute function update_updated_at();
create trigger trg_schedule_requests_updated_at before update on schedule_requests
  for each row execute function update_updated_at();

-- ============================================================
-- SEED DATA: System Roles
-- ============================================================
insert into roles (name, description, is_system_role, is_field_role) values
  ('Admin', 'System administrator with full access', true, false),
  ('Manager', 'Crew change manager', true, false),
  ('DD', 'Directional Driller', true, true),
  ('MWD', 'Measurement While Drilling', true, true);
