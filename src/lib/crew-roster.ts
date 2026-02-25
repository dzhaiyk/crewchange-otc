/**
 * Composite crew roster builder.
 *
 * Wraps computeRotationPeriods to provide per-date crew lookups
 * (who's on board, who's off, crew change swaps) across all field
 * employees for a given ship.
 */

import { computeRotationPeriods, isOnboardOnDate, type Period } from "./calendar";
import { getPositionKey, POSITIONS, type PositionKey } from "./positions";
import type { Employee, Role, CrewChange, CrewChangeEntry } from "@/types";

/* ------------------------------------------------------------------ */
/*  Public interface                                                    */
/* ------------------------------------------------------------------ */

export interface CrewRoster {
  /** Map of position → on-board employees for a date */
  getOnBoardByDate(date: string): Map<PositionKey, Employee[]>;
  /** Map of position → off-rotation employees for a date */
  getOffByDate(date: string): Map<PositionKey, Employee[]>;
  /** Whether a crew change occurs on this date */
  isCrewChangeDate(date: string): boolean;
  /** Swap details for a crew-change date */
  getSwapsOnDate(date: string): { outgoing: Employee; incoming: Employee; position: PositionKey }[];
  /** All field employees in this roster */
  fieldEmployees: Employee[];
  /** Pre-computed periods per employee ID */
  periodsMap: Map<string, Period[]>;
}

/* ------------------------------------------------------------------ */
/*  Builder                                                            */
/* ------------------------------------------------------------------ */

export function buildCrewRoster(
  allEmployees: Employee[],
  roles: Role[],
  crewChanges: CrewChange[],
  entries: CrewChangeEntry[],
  rangeStart: string,
  rangeEnd: string,
): CrewRoster {
  // Filter to active field employees with a shift set
  const roleMap = new Map(roles.map((r) => [r.id, r]));
  const fieldEmployees = allEmployees.filter((e) => {
    const role = roleMap.get(e.role_id);
    return role?.is_field_role && e.shift && e.is_active;
  });

  // Pre-compute periods per employee
  const periodsMap = new Map<string, Period[]>();
  for (const emp of fieldEmployees) {
    periodsMap.set(
      emp.id,
      computeRotationPeriods(emp, crewChanges, entries, rangeStart, rangeEnd),
    );
  }

  // Index crew change dates
  const crewChangeDateSet = new Set<string>();
  const crewChangeByDate = new Map<string, CrewChange[]>();
  for (const cc of crewChanges) {
    if (cc.status === "cancelled") continue;
    crewChangeDateSet.add(cc.scheduled_date);
    const list = crewChangeByDate.get(cc.scheduled_date) ?? [];
    list.push(cc);
    crewChangeByDate.set(cc.scheduled_date, list);
  }

  // Helper: resolve employee position key
  function empPositionKey(emp: Employee): PositionKey | null {
    const role = roleMap.get(emp.role_id);
    return getPositionKey(role?.system_key ?? null, emp.shift);
  }

  // Helper: build empty position map
  function emptyPosMap(): Map<PositionKey, Employee[]> {
    const m = new Map<PositionKey, Employee[]>();
    for (const p of POSITIONS) m.set(p.key, []);
    return m;
  }

  // Employee lookup for entries
  const empById = new Map(allEmployees.map((e) => [e.id, e]));

  return {
    fieldEmployees,
    periodsMap,

    getOnBoardByDate(date: string) {
      const result = emptyPosMap();
      for (const emp of fieldEmployees) {
        const periods = periodsMap.get(emp.id);
        if (!periods) continue;
        if (isOnboardOnDate(periods, date)) {
          const pk = empPositionKey(emp);
          if (pk) result.get(pk)!.push(emp);
        }
      }
      return result;
    },

    getOffByDate(date: string) {
      const result = emptyPosMap();
      for (const emp of fieldEmployees) {
        const periods = periodsMap.get(emp.id);
        if (!periods) continue;
        if (!isOnboardOnDate(periods, date)) {
          const pk = empPositionKey(emp);
          if (pk) result.get(pk)!.push(emp);
        }
      }
      return result;
    },

    isCrewChangeDate(date: string) {
      return crewChangeDateSet.has(date);
    },

    getSwapsOnDate(date: string) {
      const ccs = crewChangeByDate.get(date);
      if (!ccs) return [];

      const swaps: { outgoing: Employee; incoming: Employee; position: PositionKey }[] = [];
      const ccIds = new Set(ccs.map((cc) => cc.id));

      for (const entry of entries) {
        if (!ccIds.has(entry.crew_change_id)) continue;
        if (!entry.outgoing_employee_id || !entry.incoming_employee_id) continue;

        const outgoing = empById.get(entry.outgoing_employee_id);
        const incoming = empById.get(entry.incoming_employee_id);
        if (!outgoing || !incoming) continue;

        const pk = empPositionKey(outgoing) ?? empPositionKey(incoming);
        if (pk) {
          swaps.push({ outgoing, incoming, position: pk });
        }
      }

      return swaps;
    },
  };
}
