export interface DrillShip {
  id: string;
  name: string;
  helicopter_day: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Role {
  id: string;
  name: string;
  description: string | null;
  is_system_role: boolean;
  is_field_role: boolean;
  created_at: string;
  updated_at: string;
}

export interface Employee {
  id: string;
  auth_id: string | null;
  full_name: string;
  email: string;
  phone: string | null;
  role_id: string;
  drill_ship_id: string | null;
  shift: "day" | "night" | null;
  is_onboard: boolean;
  rotation_start_date: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CrewChange {
  id: string;
  drill_ship_id: string;
  scheduled_date: string;
  status: "planned" | "confirmed" | "completed" | "cancelled";
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CrewChangeEntry {
  id: string;
  crew_change_id: string;
  outgoing_employee_id: string | null;
  incoming_employee_id: string | null;
  role_id: string;
  shift: "day" | "night" | null;
  is_early: boolean;
  is_late: boolean;
  days_delta: number;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ScheduleRequest {
  id: string;
  employee_id: string;
  drill_ship_id: string;
  original_date: string;
  requested_date: string;
  reason: string;
  status: "pending" | "approved" | "denied";
  reviewed_by: string | null;
  has_conflict: boolean;
  conflict_details: string | null;
  created_at: string;
  updated_at: string;
}

export interface DayBalance {
  id: string;
  employee_id: string;
  crew_change_entry_id: string | null;
  days_amount: number;
  reason: string;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

export interface Database {
  public: {
    Tables: {
      drill_ships: {
        Row: DrillShip;
        Insert: Omit<DrillShip, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<DrillShip, "id" | "created_at" | "updated_at">>;
      };
      roles: {
        Row: Role;
        Insert: Omit<Role, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Role, "id" | "created_at" | "updated_at">>;
      };
      employees: {
        Row: Employee;
        Insert: Omit<Employee, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Employee, "id" | "created_at" | "updated_at">>;
      };
      crew_changes: {
        Row: CrewChange;
        Insert: Omit<CrewChange, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<CrewChange, "id" | "created_at" | "updated_at">>;
      };
      crew_change_entries: {
        Row: CrewChangeEntry;
        Insert: Omit<CrewChangeEntry, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<CrewChangeEntry, "id" | "created_at" | "updated_at">>;
      };
      schedule_requests: {
        Row: ScheduleRequest;
        Insert: Omit<ScheduleRequest, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<ScheduleRequest, "id" | "created_at" | "updated_at">>;
      };
      day_balances: {
        Row: DayBalance;
        Insert: Omit<DayBalance, "id" | "created_at">;
        Update: Partial<Omit<DayBalance, "id" | "created_at">>;
      };
      activity_log: {
        Row: ActivityLog;
        Insert: Omit<ActivityLog, "id" | "created_at">;
        Update: Partial<Omit<ActivityLog, "id" | "created_at">>;
      };
    };
  };
}
