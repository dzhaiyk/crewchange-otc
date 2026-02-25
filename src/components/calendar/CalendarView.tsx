import { useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CalendarDayCell } from "./CalendarDayCell";
import { getMonthDays } from "@/lib/calendar";
import { toIsoDate } from "@/lib/rotation";
import type { CrewRoster } from "@/lib/crew-roster";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

interface CalendarViewProps {
  year: number;
  month: number;
  roster: CrewRoster;
  helicopterDay: number;
  today: string;
  selectedDate: string;
  onSelectDate: (date: string) => void;
  onMonthChange: (year: number, month: number) => void;
}

export function CalendarView({
  year,
  month,
  roster,
  today,
  selectedDate,
  onSelectDate,
  onMonthChange,
}: CalendarViewProps) {
  const days = useMemo(() => getMonthDays(year, month), [year, month]);

  const handlePrev = () => {
    if (month === 0) onMonthChange(year - 1, 11);
    else onMonthChange(year, month - 1);
  };

  const handleNext = () => {
    if (month === 11) onMonthChange(year + 1, 0);
    else onMonthChange(year, month + 1);
  };

  const handleToday = () => {
    const now = new Date();
    onMonthChange(now.getFullYear(), now.getMonth());
    onSelectDate(toIsoDate(now));
  };

  return (
    <div>
      {/* Month nav bar */}
      <div className="mb-3 flex items-center gap-2">
        <Button variant="outline" size="icon-sm" onClick={handlePrev}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h2 className="min-w-[160px] text-center text-sm font-semibold">
          {MONTH_NAMES[month]} {year}
        </h2>
        <Button variant="outline" size="icon-sm" onClick={handleNext}>
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={handleToday}>
          Today
        </Button>
      </div>

      {/* Weekday headers */}
      <div className="mb-1 grid grid-cols-7 gap-1">
        {WEEKDAYS.map((day, i) => (
          <div
            key={day}
            className={`py-1 text-center text-xs font-medium ${
              i === 3 ? "rounded bg-amber-500/15 text-amber-600 dark:text-amber-400" : "text-muted-foreground"
            }`}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((d) => {
          const onBoardCrew = roster.getOnBoardByDate(d.date);
          return (
            <CalendarDayCell
              key={d.date}
              date={d.date}
              day={d.day}
              isCurrentMonth={d.isCurrentMonth}
              isToday={d.date === today}
              isSelected={d.date === selectedDate}
              isCrewChangeDay={roster.isCrewChangeDate(d.date)}
              onBoardCrew={onBoardCrew}
              onClick={() => onSelectDate(d.date)}
            />
          );
        })}
      </div>
    </div>
  );
}
