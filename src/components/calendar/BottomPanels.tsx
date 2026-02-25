import { useEffect, useMemo } from "react";
import { format } from "date-fns";
import { PosBadge } from "@/components/shared/PosBadge";
import { ALL_SWAP_COMBOS, getPositionConfig, getPositionKey, type PositionKey } from "@/lib/positions";
import { getNextCrewChangeDate } from "@/lib/calendar";
import { fromIsoDate } from "@/lib/rotation";
import { useDayBalancesStore } from "@/store/day-balances-store";
import type { CrewRoster } from "@/lib/crew-roster";
import type { Employee, Role, DrillShip } from "@/types";

interface BottomPanelsProps {
  selectedDate: string;
  roster: CrewRoster;
  fieldEmployees: Employee[];
  roles: Role[];
  ship: DrillShip;
  today: string;
}

export function BottomPanels({
  fieldEmployees,
  roles,
  ship,
  today,
}: BottomPanelsProps) {
  const { summaries, fetchSummaries } = useDayBalancesStore();

  const empIds = useMemo(() => fieldEmployees.map((e) => e.id), [fieldEmployees]);

  useEffect(() => {
    if (empIds.length > 0) fetchSummaries(empIds);
  }, [empIds, fetchSummaries]);

  const roleMap = useMemo(() => new Map(roles.map((r) => [r.id, r])), [roles]);

  // Next crew changes per employee, grouped by date
  const nextChanges = useMemo(() => {
    const byDate = new Map<string, { employee: Employee; posKey: PositionKey }[]>();
    for (const emp of fieldEmployees) {
      const next = getNextCrewChangeDate(emp, ship.helicopter_day, today);
      if (!next) continue;
      const role = roleMap.get(emp.role_id);
      const pk = getPositionKey(role?.system_key ?? null, emp.shift);
      if (!pk) continue;
      const list = byDate.get(next) ?? [];
      list.push({ employee: emp, posKey: pk });
      byDate.set(next, list);
    }
    // Sort by date
    return [...byDate.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(0, 6);
  }, [fieldEmployees, ship.helicopter_day, today, roleMap]);

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {/* Swap Rules */}
      <div className="rounded-xl border bg-card p-4">
        <h3 className="mb-3 text-sm font-semibold">Swap Rules</h3>
        <div className="space-y-1.5">
          {ALL_SWAP_COMBOS.map((combo) => (
            <div
              key={`${combo.a}-${combo.b}`}
              className={`flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs ${
                combo.isValid ? "bg-green-500/10" : "bg-red-500/10"
              }`}
            >
              <span className="flex items-center gap-1">
                <PosBadge positionKey={combo.a} size="sm" />
                <span className="text-muted-foreground">+</span>
                <PosBadge positionKey={combo.b} size="sm" />
              </span>
              <span className={combo.isValid ? "text-green-500" : "text-red-500"}>
                {combo.isValid ? "\u2713" : "\u2717"}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Next Crew Changes */}
      <div className="rounded-xl border bg-card p-4">
        <h3 className="mb-3 text-sm font-semibold">Next Crew Changes</h3>
        {nextChanges.length === 0 ? (
          <p className="text-xs text-muted-foreground">No upcoming crew changes</p>
        ) : (
          <div className="space-y-3">
            {nextChanges.map(([date, group]) => (
              <div key={date}>
                <div className="mb-1 text-xs font-medium text-muted-foreground">
                  {format(fromIsoDate(date), "MMM d, yyyy")}
                </div>
                <div className="flex flex-wrap gap-1">
                  {group.map(({ employee, posKey }) => (
                    <span
                      key={employee.id}
                      className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px]"
                      style={{ backgroundColor: `${getPositionConfig(posKey).colorHex}20` }}
                    >
                      <span className="font-medium">{employee.full_name.split(" ")[0]}</span>
                      <PosBadge positionKey={posKey} size="sm" />
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Day Balances */}
      <div className="rounded-xl border bg-card p-4">
        <h3 className="mb-3 text-sm font-semibold">Day Balances</h3>
        <div className="space-y-1.5">
          {fieldEmployees.map((emp) => {
            const balance = summaries.get(emp.id) ?? 0;
            const role = roleMap.get(emp.role_id);
            const pk = getPositionKey(role?.system_key ?? null, emp.shift);
            const colorClass =
              balance > 0
                ? "text-green-500"
                : balance < 0
                  ? "text-red-500"
                  : "text-muted-foreground";

            return (
              <div key={emp.id} className="flex items-center gap-2 text-xs">
                {/* Mini avatar */}
                <div
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded text-[8px] font-semibold text-white bg-gradient-to-br ${pk ? getPositionConfig(pk).gradient : "from-gray-400 to-gray-500"}`}
                >
                  {emp.full_name.slice(0, 1)}
                </div>
                <span className="min-w-0 flex-1 truncate">{emp.full_name}</span>
                <span className={`font-mono font-semibold ${colorClass}`}>
                  {balance > 0 ? `+${balance}d` : balance < 0 ? `${balance}d` : "0d"}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
