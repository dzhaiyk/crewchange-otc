import { useMemo } from "react";
import { PersonChip, type ChipMode } from "@/components/shared/PersonChip";
import { POSITIONS } from "@/lib/positions";
import type { CrewRoster } from "@/lib/crew-roster";
import type { Employee } from "@/types";

interface CrewCardsProps {
  selectedDate: string;
  roster: CrewRoster;
  onPersonClick?: (employee: Employee) => void;
}

export function CrewCards({ selectedDate, roster, onPersonClick }: CrewCardsProps) {
  const onBoard = useMemo(() => roster.getOnBoardByDate(selectedDate), [roster, selectedDate]);
  const offBoard = useMemo(() => roster.getOffByDate(selectedDate), [roster, selectedDate]);
  const isCC = roster.isCrewChangeDate(selectedDate);
  const swaps = useMemo(
    () => (isCC ? roster.getSwapsOnDate(selectedDate) : []),
    [roster, selectedDate, isCC],
  );

  // Build swap lookup: employeeId → mode
  const swapModes = useMemo(() => {
    const m = new Map<string, ChipMode>();
    for (const s of swaps) {
      m.set(s.outgoing.id, "swap-out");
      m.set(s.incoming.id, "swap-in");
    }
    return m;
  }, [swaps]);

  function chipMode(emp: Employee, isDimmed: boolean): ChipMode {
    return swapModes.get(emp.id) ?? (isDimmed ? "dimmed" : "normal");
  }

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      {/* ON BOARD */}
      <div className="rounded-xl border bg-gradient-to-br from-blue-950/40 to-slate-900/30 p-4">
        <div className="mb-3 flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
            <span className="relative h-2.5 w-2.5 rounded-full bg-green-500" />
          </span>
          <span className="text-sm font-semibold tracking-wide text-green-400">ON BOARD</span>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {POSITIONS.map((pos) => {
            const emps = onBoard.get(pos.key) ?? [];
            return emps.map((emp) => (
              <PersonChip
                key={emp.id}
                employee={emp}
                positionKey={pos.key}
                mode={chipMode(emp, false)}
                onClick={onPersonClick ? () => onPersonClick(emp) : undefined}
              />
            ));
          })}
        </div>
      </div>

      {/* OFF ROTATION */}
      <div className="rounded-xl border bg-gradient-to-br from-slate-800/30 to-slate-900/20 p-4">
        <div className="mb-3 flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-gray-500" />
          <span className="text-sm font-semibold tracking-wide text-gray-400">OFF ROTATION</span>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {POSITIONS.map((pos) => {
            const emps = offBoard.get(pos.key) ?? [];
            return emps.map((emp) => (
              <PersonChip
                key={emp.id}
                employee={emp}
                positionKey={pos.key}
                mode={chipMode(emp, true)}
              />
            ));
          })}
        </div>
      </div>
    </div>
  );
}
