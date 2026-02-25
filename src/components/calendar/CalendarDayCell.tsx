import { getPositionConfig, POSITIONS, type PositionKey } from "@/lib/positions";
import type { Employee } from "@/types";

interface CalendarDayCellProps {
  date: string;
  day: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  isCrewChangeDay: boolean;
  onBoardCrew: Map<PositionKey, Employee[]>;
  onClick: () => void;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export function CalendarDayCell({
  day,
  isCurrentMonth,
  isToday,
  isSelected,
  isCrewChangeDay,
  onBoardCrew,
  onClick,
}: CalendarDayCellProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex min-h-[72px] flex-col rounded-lg border p-1 text-left transition-colors ${
        !isCurrentMonth ? "opacity-20" : ""
      } ${isSelected ? "border-l-[3px] border-l-blue-500 bg-accent" : "border-border hover:bg-accent/50"} ${
        isCrewChangeDay && isCurrentMonth ? "bg-amber-500/10" : ""
      }`}
    >
      {/* Top row */}
      <div className="flex items-center justify-between">
        <span
          className={`text-xs font-medium ${
            isToday
              ? "flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-white"
              : "text-muted-foreground"
          }`}
        >
          {day}
        </span>
        {isCrewChangeDay && isCurrentMonth && (
          <span className="text-[10px]" title="Crew Change">
            {"\uD83D\uDE81"}
          </span>
        )}
      </div>

      {/* 2x2 mini avatar grid */}
      <div className="mt-auto grid grid-cols-2 gap-0.5">
        {POSITIONS.map((pos) => {
          const emps = onBoardCrew.get(pos.key) ?? [];
          const emp = emps[0];
          if (!emp) return <div key={pos.key} className="h-[18px] w-[18px]" />;

          const config = getPositionConfig(pos.key);
          return (
            <div
              key={pos.key}
              className={`flex h-[18px] w-[18px] items-center justify-center rounded bg-gradient-to-br text-[8px] font-semibold text-white ${config.gradient}`}
              title={`${emp.full_name} (${config.label})`}
            >
              {getInitials(emp.full_name)}
            </div>
          );
        })}
      </div>
    </button>
  );
}
