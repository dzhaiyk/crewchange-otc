import { format } from "date-fns";
import { fromIsoDate } from "@/lib/rotation";
import type { TimelineWeek } from "@/lib/calendar";
import { cn } from "@/lib/utils";

interface WeekHeaderProps {
  weeks: TimelineWeek[];
  helicopterDay: number;
  today: string;
}

export function WeekHeader({ weeks, helicopterDay, today }: WeekHeaderProps) {
  return (
    <div
      className="grid border-b"
      style={{
        gridTemplateColumns: `200px repeat(${weeks.length}, 1fr)`,
      }}
    >
      {/* Empty cell for name column */}
      <div className="border-r px-3 py-2 text-xs font-medium text-muted-foreground">
        Employee
      </div>

      {weeks.map((week) => {
        const isCurrentWeek = today >= week.start && today <= week.end;
        const date = fromIsoDate(week.start);

        return (
          <div
            key={week.start}
            className={cn(
              "border-r px-1.5 py-2 text-center last:border-r-0",
              isCurrentWeek && "bg-accent/50",
            )}
          >
            <div className="text-xs font-medium">
              {format(date, "MMM d")}
            </div>
            <div className="flex items-center justify-center gap-1 mt-0.5">
              <HelicopterDayDots weekStart={week.start} helicopterDay={helicopterDay} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Show a small diamond on the day within this week that is the helicopter day. */
function HelicopterDayDots({
  weekStart,
  helicopterDay,
}: {
  weekStart: string;
  helicopterDay: number;
}) {
  const dayOfWeekStart = fromIsoDate(weekStart).getDay();
  const offset = (helicopterDay - dayOfWeekStart + 7) % 7;

  // Only show if the helicopter day falls within this 7-day week
  if (offset >= 7) return null;

  return (
    <span className="text-amber-500 text-[10px]" title="Helicopter day">
      ◆
    </span>
  );
}
