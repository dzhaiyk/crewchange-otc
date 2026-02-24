/**
 * Client-side crew change scheduler.
 * Generates proposed crew change plans for preview and explicit save.
 */

import type { Employee, DrillShip, Role } from "@/types";
import { generateCrewChangeDates } from "./rotation";
import {
  makeRoleKey,
  validateCrewChangeDay,
  type ConstraintConfig,
  DEFAULT_CONSTRAINT_CONFIG,
} from "./constraints";

export interface ProposedEntry {
  roleId: string;
  roleName: string;
  shift: "day" | "night";
  outgoingEmployeeId: string | null;
  outgoingEmployeeName: string | null;
  incomingEmployeeId: string | null;
  incomingEmployeeName: string | null;
  isEarly: boolean;
  isLate: boolean;
  daysDelta: number;
}

export interface ProposedCrewChange {
  scheduledDate: string;
  drillShipId: string;
  entries: ProposedEntry[];
}

export interface ValidationError {
  date: string;
  message: string;
}

/**
 * Generate a default crew change plan based on employee rotation data.
 *
 * For each generated date, pairs onboard employees (outgoing) with
 * off-board employees of the same role and shift (incoming).
 */
export function generateDefaultPlan(
  employees: Employee[],
  roles: Role[],
  ship: DrillShip,
  startDate: string,
  count: number
): ProposedCrewChange[] {
  const dates = generateCrewChangeDates(startDate, ship.helicopter_day, count);
  const shipEmployees = employees.filter(
    (e) => e.drill_ship_id === ship.id && e.is_active
  );

  const roleMap = new Map(roles.map((r) => [r.id, r]));

  return dates.map((date) => {
    const entries: ProposedEntry[] = [];

    // Group employees by role + shift
    const groups = new Map<string, { onboard: Employee[]; offshore: Employee[] }>();

    for (const emp of shipEmployees) {
      if (!emp.shift || !emp.role_id) continue;
      const key = `${emp.role_id}:${emp.shift}`;
      if (!groups.has(key)) groups.set(key, { onboard: [], offshore: [] });
      const group = groups.get(key)!;
      if (emp.is_onboard) {
        group.onboard.push(emp);
      } else {
        group.offshore.push(emp);
      }
    }

    for (const [key, group] of groups) {
      const [roleId, shift] = key.split(":") as [string, "day" | "night"];
      const role = roleMap.get(roleId);
      const roleName = role?.name ?? "Unknown";

      // Pair outgoing (onboard) with incoming (offshore)
      const pairCount = Math.min(group.onboard.length, group.offshore.length);
      for (let i = 0; i < pairCount; i++) {
        const outgoing = group.onboard[i]!;
        const incoming = group.offshore[i]!;
        entries.push({
          roleId,
          roleName,
          shift,
          outgoingEmployeeId: outgoing.id,
          outgoingEmployeeName: outgoing.full_name,
          incomingEmployeeId: incoming.id,
          incomingEmployeeName: incoming.full_name,
          isEarly: false,
          isLate: false,
          daysDelta: 0,
        });
      }

      // Unpaired onboard (no replacement available)
      for (let i = pairCount; i < group.onboard.length; i++) {
        const outgoing = group.onboard[i]!;
        entries.push({
          roleId,
          roleName,
          shift,
          outgoingEmployeeId: outgoing.id,
          outgoingEmployeeName: outgoing.full_name,
          incomingEmployeeId: null,
          incomingEmployeeName: null,
          isEarly: false,
          isLate: false,
          daysDelta: 0,
        });
      }
    }

    return {
      scheduledDate: date,
      drillShipId: ship.id,
      entries,
    };
  });
}

/**
 * Validate a set of crew change entries for constraint violations.
 */
export function validatePlan(
  entries: Array<{
    date: string;
    roleName: string;
    shift: "day" | "night";
  }>,
  config: ConstraintConfig = DEFAULT_CONSTRAINT_CONFIG
): ValidationError[] {
  const errors: ValidationError[] = [];
  const existingChanges = entries.map((e) => ({
    roleKey: makeRoleKey(e.roleName, e.shift),
    date: e.date,
  }));

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i]!;
    const roleKey = makeRoleKey(entry.roleName, entry.shift);
    // Check against all other entries (not self)
    const others = existingChanges.filter((_, idx) => idx !== i);
    const conflicts = validateCrewChangeDay(roleKey, entry.date, others, config);
    for (const msg of conflicts) {
      // Avoid duplicate error messages for the same date
      if (!errors.some((e) => e.date === entry.date && e.message === msg)) {
        errors.push({ date: entry.date, message: msg });
      }
    }
  }

  return errors;
}
