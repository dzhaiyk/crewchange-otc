import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { diffDays } from "@/lib/rotation";
import type { Period, TimelineWeek } from "@/lib/calendar";
import type { Employee, ScheduleRequest } from "@/types";

interface EmployeeRowProps {
  employee: Employee;
  periods: Period[];
  pendingRequests: ScheduleRequest[];
  weeks: TimelineWeek[];
  shift: "day" | "night" | null;
  onMoveHitch: (employee: Employee) => void;
}

export function EmployeeRow({
  employee,
  periods,
  pendingRequests,
  weeks,
  shift,
  onMoveHitch,
}: EmployeeRowProps) {
  const totalDays = weeks.length * 7;
  const rangeStart = weeks[0]?.start;

  // Map periods to grid positions (using a percentage-based approach within each row)
  const bars = useMemo(() => {
    if (!rangeStart) return [];

    return periods.map((p) => {
      const startDay = Math.max(0, diffDays(rangeStart, p.start));
      const endDay = Math.min(totalDays, diffDays(rangeStart, p.end));
      const leftPct = (startDay / totalDays) * 100;
      const widthPct = ((endDay - startDay) / totalDays) * 100;

      return {
        ...p,
        leftPct,
        widthPct,
        key: `${p.start}-${p.end}-${p.type}`,
      };
    });
  }, [periods, rangeStart, totalDays]);

  // Map pending requests to ghost bars
  const pendingBars = useMemo(() => {
    if (!rangeStart) return [];

    return pendingRequests
      .filter((r) => r.status === "pending")
      .map((r) => {
        const startDay = Math.max(0, diffDays(rangeStart, r.requested_date));
        // Show a 28-day onboard block from the requested date
        const endDay = Math.min(totalDays, startDay + 28);
        const leftPct = (startDay / totalDays) * 100;
        const widthPct = ((endDay - startDay) / totalDays) * 100;

        return {
          leftPct,
          widthPct,
          key: `pending-${r.id}`,
        };
      });
  }, [pendingRequests, rangeStart, totalDays]);

  const barColor =
    shift === "night"
      ? "bg-indigo-500/80 dark:bg-indigo-400/70"
      : "bg-blue-500/80 dark:bg-blue-400/70";

  return (
    <div
      className="grid border-b last:border-b-0 group"
      style={{
        gridTemplateColumns: `200px 1fr`,
      }}
    >
      {/* Name cell */}
      <div
        className="flex items-center gap-2 border-r px-3 py-2 cursor-pointer hover:bg-accent/50 transition-colors"
        onClick={() => onMoveHitch(employee)}
        title="Click to move hitch"
      >
        <span className="text-sm truncate">{employee.full_name}</span>
      </div>

      {/* Timeline bar area */}
      <div className="relative h-10">
        {/* Week grid lines */}
        <div
          className="absolute inset-0 grid"
          style={{
            gridTemplateColumns: `repeat(${weeks.length}, 1fr)`,
          }}
        >
          {weeks.map((w) => (
            <div key={w.start} className="border-r last:border-r-0" />
          ))}
        </div>

        {/* Onboard bars */}
        {bars.map((bar) =>
          bar.type === "onboard" ? (
            <div
              key={bar.key}
              className={cn(
                "absolute top-1.5 h-7 rounded-sm transition-opacity",
                barColor,
                bar.isConfirmed && "opacity-100",
                !bar.isConfirmed && "opacity-70",
              )}
              style={{
                left: `${bar.leftPct}%`,
                width: `${Math.max(bar.widthPct, 0.5)}%`,
              }}
              title={`Onboard: ${bar.start} → ${bar.end}${bar.isConfirmed ? " (confirmed)" : ""}`}
            />
          ) : null,
        )}

        {/* Pending move requests (dashed outlines) */}
        {pendingBars.map((bar) => (
          <div
            key={bar.key}
            className="absolute top-1.5 h-7 rounded-sm border-2 border-dashed border-amber-500/70"
            style={{
              left: `${bar.leftPct}%`,
              width: `${Math.max(bar.widthPct, 0.5)}%`,
            }}
            title="Pending hitch move request"
          />
        ))}
      </div>
    </div>
  );
}
