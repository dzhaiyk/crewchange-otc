import { useMemo } from "react";
import { getPositionConfig, type PositionKey } from "@/lib/positions";
import { type Period, type TimelineWeek } from "@/lib/calendar";
import { diffDays } from "@/lib/rotation";
import type { Employee } from "@/types";

interface TimelineLaneProps {
  positionKey: PositionKey;
  employees: Employee[];
  periodsMap: Map<string, Period[]>;
  weeks: TimelineWeek[];
  colWidth: number;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

interface BarSegment {
  employee: Employee;
  startCol: number; // fractional column index
  widthCols: number;
}

export function TimelineLane({
  positionKey,
  employees,
  periodsMap,
  weeks,
  colWidth,
}: TimelineLaneProps) {
  const config = getPositionConfig(positionKey);
  const isNight = config.shift === "night";
  const totalWidth = weeks.length * colWidth;

  // Compute bar segments for each employee
  const segments = useMemo(() => {
    const bars: BarSegment[] = [];
    const rangeStart = weeks[0]?.start;
    const rangeEnd = weeks[weeks.length - 1]?.end;
    if (!rangeStart || !rangeEnd) return bars;

    for (const emp of employees) {
      const periods = periodsMap.get(emp.id);
      if (!periods) continue;

      // Find contiguous on-board stretches
      for (const period of periods) {
        if (period.type !== "onboard") continue;
        if (period.end <= rangeStart || period.start >= rangeEnd) continue;

        const clippedStart = period.start < rangeStart ? rangeStart : period.start;
        const clippedEnd = period.end > rangeEnd ? rangeEnd : period.end;

        const startDaysFromOrigin = diffDays(rangeStart, clippedStart);
        const durationDays = diffDays(clippedStart, clippedEnd);

        bars.push({
          employee: emp,
          startCol: startDaysFromOrigin / 7,
          widthCols: durationDays / 7,
        });
      }
    }
    return bars;
  }, [employees, periodsMap, weeks]);

  return (
    <div className="relative h-10" style={{ width: totalWidth }}>
      {/* Week grid lines */}
      {weeks.map((w, i) => (
        <div
          key={w.start}
          className="absolute top-0 h-full border-r border-border/30"
          style={{ left: i * colWidth, width: colWidth }}
        />
      ))}

      {/* Rotation bars */}
      {segments.map((seg, idx) => {
        const left = seg.startCol * colWidth;
        const width = Math.max(seg.widthCols * colWidth - 2, 4);

        return (
          <div
            key={`${seg.employee.id}-${idx}`}
            className={`absolute top-1 flex items-center gap-1 rounded-md px-1 transition-[filter] hover:brightness-110 ${isNight ? "stripe-overlay" : ""}`}
            style={{
              left,
              width,
              height: 32,
              background: `linear-gradient(135deg, ${config.colorHex}, ${config.colorHex}dd)`,
            }}
          >
            {/* Mini avatar */}
            <div className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded bg-white/20 text-[9px] font-semibold text-white">
              {getInitials(seg.employee.full_name)}
            </div>
            {width > 80 && (
              <span className="truncate text-[10px] font-medium text-white/90">
                {seg.employee.full_name.split(" ")[0]}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
