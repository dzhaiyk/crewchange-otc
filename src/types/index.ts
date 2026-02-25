import type { Employee, Role } from "./database";

export type { DrillShip, Role, Employee, CrewChange, CrewChangeEntry, ScheduleRequest, DayBalance, ActivityLog, Database } from "./database";

export interface AuthUser {
  id: string;
  email: string;
  employee: Employee | null;
  role: Role | null;
}

export interface NavItem {
  label: string;
  path: string;
  icon: string;
  allowedRoles: string[];
}

export const HELICOPTER_DAYS = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
] as const;

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", path: "/", icon: "LayoutDashboard", allowedRoles: [] },
  { label: "Calendar", path: "/calendar", icon: "CalendarDays", allowedRoles: [] },
  { label: "Crew Changes", path: "/crew-changes", icon: "CalendarClock", allowedRoles: ["admin", "manager"] },
  { label: "Schedule Requests", path: "/schedule-requests", icon: "ClipboardList", allowedRoles: [] },
  { label: "Drill Ships", path: "/drill-ships", icon: "Ship", allowedRoles: ["admin"] },
  { label: "Roles", path: "/roles", icon: "Shield", allowedRoles: ["admin"] },
  { label: "Employees", path: "/employees", icon: "Users", allowedRoles: ["admin", "manager"] },
  { label: "Activity Log", path: "/activity-log", icon: "ScrollText", allowedRoles: ["admin", "manager"] },
];
