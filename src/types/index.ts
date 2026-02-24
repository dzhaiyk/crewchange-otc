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
  { label: "Drill Ships", path: "/drill-ships", icon: "Ship", allowedRoles: ["Admin"] },
  { label: "Roles", path: "/roles", icon: "Shield", allowedRoles: ["Admin"] },
  { label: "Employees", path: "/employees", icon: "Users", allowedRoles: ["Admin", "Manager"] },
];
