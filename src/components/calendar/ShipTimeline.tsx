import { useMemo } from "react";
import { WeekHeader } from "./WeekHeader";
import { EmployeeRow } from "./EmployeeRow";
import { computeRotationPeriods } from "@/lib/calendar";
import type { TimelineWeek } from "@/lib/calendar";
import type {
  Employee,
  CrewChange,
  CrewChangeEntry,
  ScheduleRequest,
  DrillShip,
} from "@/types";

interface ShipTimelineProps {
  ship: DrillShip;
  employees: Employee[];
  crewChanges: CrewChange[];
  entries: CrewChangeEntry[];
  pendingRequests: ScheduleRequest[];
  weeks: TimelineWeek[];
  today: string;
  onMoveHitch: (employee: Employee) => void;
}

export function ShipTimeline({
  ship,
  employees,
  crewChanges,
  entries,
  pendingRequests,
  weeks,
  today,
  onMoveHitch,
}: ShipTimelineProps) {
  const rangeStart = weeks[0]?.start;
  const rangeEnd = weeks[weeks.length - 1]?.end;

  // Group employees by shift
  const { dayShift, nightShift } = useMemo(() => {
    const day: Employee[] = [];
    const night: Employee[] = [];

    for (const emp of employees) {
      if (emp.shift === "night") {
        night.push(emp);
      } else {
        day.push(emp);
      }
    }

    day.sort((a, b) => a.full_name.localeCompare(b.full_name));
    night.sort((a, b) => a.full_name.localeCompare(b.full_name));

    return { dayShift: day, nightShift: night };
  }, [employees]);

  // Pre-compute periods for all employees
  const periodsMap = useMemo(() => {
    if (!rangeStart || !rangeEnd) return new Map<string, ReturnType<typeof computeRotationPeriods>>();

    const map = new Map<string, ReturnType<typeof computeRotationPeriods>>();
    for (const emp of employees) {
      map.set(
        emp.id,
        computeRotationPeriods(emp, crewChanges, entries, rangeStart, rangeEnd),
      );
    }
    return map;
  }, [employees, crewChanges, entries, rangeStart, rangeEnd]);

  // Group pending requests by employee
  const requestsByEmployee = useMemo(() => {
    const map = new Map<string, ScheduleRequest[]>();
    for (const r of pendingRequests) {
      const list = map.get(r.employee_id) ?? [];
      list.push(r);
      map.set(r.employee_id, list);
    }
    return map;
  }, [pendingRequests]);

  if (!weeks.length) return null;

  const renderGroup = (label: string, group: Employee[], shift: "day" | "night") => {
    if (group.length === 0) return null;

    return (
      <div>
        {/* Shift section header */}
        <div className="grid border-b bg-muted/50" style={{ gridTemplateColumns: "200px 1fr" }}>
          <div className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <span
              className={`h-2 w-2 rounded-full ${
                shift === "night" ? "bg-indigo-500" : "bg-blue-500"
              }`}
            />
            {label}
          </div>
          <div />
        </div>

        {group.map((emp) => (
          <EmployeeRow
            key={emp.id}
            employee={emp}
            periods={periodsMap.get(emp.id) ?? []}
            pendingRequests={requestsByEmployee.get(emp.id) ?? []}
            weeks={weeks}
            shift={shift}
            onMoveHitch={onMoveHitch}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      {/* Column headers */}
      <WeekHeader
        weeks={weeks}
        helicopterDay={ship.helicopter_day}
        today={today}
      />

      {/* Today indicator line — positioned via overlay */}
      <div className="relative">
        <TodayLine weeks={weeks} today={today} />

        {renderGroup("Day Shift", dayShift, "day")}
        {renderGroup("Night Shift", nightShift, "night")}

        {employees.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            No employees assigned to this ship.
          </div>
        )}
      </div>
    </div>
  );
}

/** Thin vertical line marking today's position on the timeline. */
function TodayLine({ weeks, today }: { weeks: TimelineWeek[]; today: string }) {
  const rangeStart = weeks[0]?.start;
  if (!rangeStart) return null;

  const totalDays = weeks.length * 7;

  // Import diffDays inline to avoid circular issues
  const dayOffset = (() => {
    const start = new Date(rangeStart);
    const now = new Date(today);
    return Math.round((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  })();

  if (dayOffset < 0 || dayOffset > totalDays) return null;

  // Account for the 200px name column
  const pct = (dayOffset / totalDays) * 100;

  return (
    <div
      className="absolute top-0 bottom-0 w-px bg-red-500/60 z-10 pointer-events-none"
      style={{ left: `calc(200px + ${pct}% * (100% - 200px) / 100%)` }}
    >
      <div className="absolute -top-0.5 -left-1 h-2 w-2 rounded-full bg-red-500" />
    </div>
  );
}
