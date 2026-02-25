import { useMemo } from "react";
import { format } from "date-fns";
import { TimelineLane } from "./TimelineLane";
import { getTimelineWeeks } from "@/lib/calendar";
import { getPositionKey, POSITIONS, type PositionKey } from "@/lib/positions";
import { diffDays, fromIsoDate } from "@/lib/rotation";
import type { CrewRoster } from "@/lib/crew-roster";
import type { Employee, Role } from "@/types";

const COL_WIDTH = 72;
const LABEL_WIDTH = 110;
const WEEK_COUNT = 12;

interface TimelineViewProps {
  roster: CrewRoster;
  fieldEmployees: Employee[];
  roles: Role[];
  startDate: string;
  today: string;
  selectedDate: string;
  onSelectDate: (date: string) => void;
}

export function TimelineView({
  roster,
  fieldEmployees,
  roles,
  startDate,
  today,
  selectedDate,
  onSelectDate,
}: TimelineViewProps) {
  const weeks = useMemo(() => getTimelineWeeks(startDate, WEEK_COUNT), [startDate]);
  const totalWidth = weeks.length * COL_WIDTH;

  const roleMap = useMemo(() => new Map(roles.map((r) => [r.id, r])), [roles]);

  // Group employees by position
  const posGroups = useMemo(() => {
    const groups = new Map<PositionKey, Employee[]>();
    for (const p of POSITIONS) groups.set(p.key, []);
    for (const emp of fieldEmployees) {
      const role = roleMap.get(emp.role_id);
      const pk = getPositionKey(role?.system_key ?? null, emp.shift);
      if (pk) groups.get(pk)!.push(emp);
    }
    return groups;
  }, [fieldEmployees, roleMap]);

  // Month header spans
  const monthSpans = useMemo(() => {
    const spans: { label: string; colStart: number; colSpan: number }[] = [];
    let currentLabel = "";
    let currentStart = 0;
    let currentSpan = 0;

    weeks.forEach((w, i) => {
      const d = fromIsoDate(w.start);
      const label = format(d, "MMMM yyyy");
      if (label === currentLabel) {
        currentSpan++;
      } else {
        if (currentLabel) spans.push({ label: currentLabel, colStart: currentStart, colSpan: currentSpan });
        currentLabel = label;
        currentStart = i;
        currentSpan = 1;
      }
    });
    if (currentLabel) spans.push({ label: currentLabel, colStart: currentStart, colSpan: currentSpan });
    return spans;
  }, [weeks]);

  // Today marker position
  const todayOffset = useMemo(() => {
    if (!weeks.length) return null;
    const daysFromStart = diffDays(weeks[0]!.start, today);
    if (daysFromStart < 0 || daysFromStart >= weeks.length * 7) return null;
    return (daysFromStart / 7) * COL_WIDTH;
  }, [weeks, today]);

  return (
    <div className="overflow-x-auto rounded-xl border bg-card">
      <div className="flex">
        {/* Left labels column */}
        <div className="shrink-0" style={{ width: LABEL_WIDTH }}>
          {/* Month header spacer */}
          <div className="h-7 border-b border-border/50" />
          {/* Week label spacer */}
          <div className="h-6 border-b border-border/50" />
          {/* Position labels */}
          {POSITIONS.map((pos) => (
            <div
              key={pos.key}
              className="flex h-10 items-center gap-1.5 border-b border-border/30 px-2"
            >
              <span
                className="inline-block h-3 w-3 rounded"
                style={{ background: `linear-gradient(135deg, ${pos.colorHex}, ${pos.colorHex}dd)` }}
              />
              <span className="text-xs font-medium">{pos.label}</span>
            </div>
          ))}
        </div>

        {/* Scrollable timeline area */}
        <div className="relative min-w-0 flex-1 overflow-x-auto">
          <div style={{ width: totalWidth }}>
            {/* Month headers */}
            <div className="flex h-7 border-b border-border/50">
              {monthSpans.map((span) => (
                <div
                  key={`${span.label}-${span.colStart}`}
                  className="flex items-center border-r border-border/30 px-2 text-xs font-semibold"
                  style={{ width: span.colSpan * COL_WIDTH }}
                >
                  {span.label}
                </div>
              ))}
            </div>

            {/* Week labels */}
            <div className="flex h-6 border-b border-border/50">
              {weeks.map((w) => {
                const isCurrentWeek = today >= w.start && today < w.end;
                const isCCWeek = roster.isCrewChangeDate(w.start);
                return (
                  <button
                    key={w.start}
                    type="button"
                    onClick={() => onSelectDate(w.start)}
                    className={`flex items-center justify-center border-r border-border/30 text-[10px] transition-colors ${
                      isCurrentWeek
                        ? "bg-blue-500/15 font-semibold text-blue-500"
                        : w.start === selectedDate
                          ? "bg-accent font-medium"
                          : "text-muted-foreground hover:bg-accent/50"
                    }`}
                    style={{ width: COL_WIDTH }}
                  >
                    {isCCWeek && <span className="mr-0.5">{"\uD83D\uDE81"}</span>}
                    {w.label}
                  </button>
                );
              })}
            </div>

            {/* Swim lanes */}
            {POSITIONS.map((pos) => (
              <div key={pos.key} className="border-b border-border/30">
                <TimelineLane
                  positionKey={pos.key}
                  employees={posGroups.get(pos.key) ?? []}
                  periodsMap={roster.periodsMap}
                  weeks={weeks}
                  colWidth={COL_WIDTH}
                />
              </div>
            ))}
          </div>

          {/* Today marker */}
          {todayOffset !== null && (
            <div
              className="pointer-events-none absolute top-0 z-10"
              style={{ left: todayOffset, height: "100%" }}
            >
              <div className="h-full w-0.5 bg-red-500" />
              <div className="absolute top-0 -translate-x-1/2 h-2 w-2 rounded-full bg-red-500" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
