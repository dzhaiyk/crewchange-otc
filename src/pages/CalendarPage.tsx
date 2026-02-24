import { useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ShipTimeline } from "@/components/calendar/ShipTimeline";
import { MoveHitchDialog } from "@/components/calendar/MoveHitchDialog";
import { getTimelineWeeks, getMonthViewStart } from "@/lib/calendar";
import { toIsoDate, addDays } from "@/lib/rotation";
import { supabase } from "@/lib/supabase";
import { useDrillShipsStore } from "@/store/drill-ships-store";
import { useEmployeesStore } from "@/store/employees-store";
import { useCrewChangesStore } from "@/store/crew-changes-store";
import { useScheduleRequestsStore } from "@/store/schedule-requests-store";
import { useAuth } from "@/hooks/use-auth";
import type { Employee, CrewChangeEntry } from "@/types";

const WEEKS_TO_SHOW = 12;

export function CalendarPage() {
  const { employee: currentEmployee, isAdmin, isManager } = useAuth();

  // Stores
  const { ships, fetch: fetchShips, loading: shipsLoading } = useDrillShipsStore();
  const {
    employees,
    fetch: fetchEmployees,
    loading: employeesLoading,
  } = useEmployeesStore();
  const {
    crewChanges,
    fetch: fetchCrewChanges,
  } = useCrewChangesStore();
  const {
    requests,
    fetch: fetchRequests,
  } = useScheduleRequestsStore();

  // Local state
  const [selectedShipId, setSelectedShipId] = useState<string>("");
  const [viewYear, setViewYear] = useState(() => new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth());
  const [allEntries, setAllEntries] = useState<CrewChangeEntry[]>([]);
  const [entriesLoading, setEntriesLoading] = useState(false);
  const [hitchDialogOpen, setHitchDialogOpen] = useState(false);
  const [hitchEmployee, setHitchEmployee] = useState<Employee | null>(null);

  const today = toIsoDate(new Date());

  // Compute timeline weeks from view start
  const viewStart = useMemo(
    () => getMonthViewStart(viewYear, viewMonth),
    [viewYear, viewMonth],
  );
  const weeks = useMemo(() => getTimelineWeeks(viewStart, WEEKS_TO_SHOW), [viewStart]);
  const lastWeek = weeks[weeks.length - 1];
  const rangeEnd = lastWeek ? addDays(lastWeek.end, 1) : viewStart;

  // --- Initial data fetch ---
  useEffect(() => {
    fetchShips();
    fetchEmployees();
    fetchCrewChanges();
    fetchRequests();
  }, [fetchShips, fetchEmployees, fetchCrewChanges, fetchRequests]);

  // Auto-select ship (prefer current employee's ship, else first active ship)
  useEffect(() => {
    if (selectedShipId) return;
    if (currentEmployee?.drill_ship_id) {
      setSelectedShipId(currentEmployee.drill_ship_id);
    } else if (ships.length > 0) {
      const active = ships.find((s) => s.is_active);
      if (active) setSelectedShipId(active.id);
    }
  }, [ships, currentEmployee, selectedShipId]);

  // Fetch all crew change entries for crew changes in the visible range
  useEffect(() => {
    if (!selectedShipId || crewChanges.length === 0) {
      setAllEntries([]);
      return;
    }

    const shipCCs = crewChanges.filter(
      (cc) =>
        cc.drill_ship_id === selectedShipId &&
        cc.scheduled_date >= viewStart &&
        cc.scheduled_date <= rangeEnd,
    );

    if (shipCCs.length === 0) {
      setAllEntries([]);
      return;
    }

    const ccIds = shipCCs.map((cc) => cc.id);

    setEntriesLoading(true);
    supabase
      .from("crew_change_entries")
      .select("*")
      .in("crew_change_id", ccIds)
      .then(({ data }) => {
        setAllEntries((data as CrewChangeEntry[] | null) ?? []);
        setEntriesLoading(false);
      });
  }, [selectedShipId, crewChanges, viewStart, rangeEnd]);

  // --- Derived data ---
  const selectedShip = ships.find((s) => s.id === selectedShipId) ?? null;

  const shipEmployees = useMemo(
    () =>
      employees.filter(
        (e) => e.drill_ship_id === selectedShipId && e.is_active,
      ),
    [employees, selectedShipId],
  );

  const shipCrewChanges = useMemo(
    () => crewChanges.filter((cc) => cc.drill_ship_id === selectedShipId),
    [crewChanges, selectedShipId],
  );

  const shipRequests = useMemo(
    () =>
      requests.filter(
        (r) => r.drill_ship_id === selectedShipId && r.status === "pending",
      ),
    [requests, selectedShipId],
  );

  // --- Handlers ---
  const handlePrevMonth = () => {
    setViewMonth((m) => {
      if (m === 0) {
        setViewYear((y) => y - 1);
        return 11;
      }
      return m - 1;
    });
  };

  const handleNextMonth = () => {
    setViewMonth((m) => {
      if (m === 11) {
        setViewYear((y) => y + 1);
        return 0;
      }
      return m + 1;
    });
  };

  const handleToday = () => {
    const now = new Date();
    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth());
  };

  const handleMoveHitch = useCallback(
    (emp: Employee) => {
      // Field employees can only move their own hitch
      if (!isAdmin && !isManager && emp.id !== currentEmployee?.id) return;
      setHitchEmployee(emp);
      setHitchDialogOpen(true);
    },
    [isAdmin, isManager, currentEmployee],
  );

  const loading = shipsLoading || employeesLoading || entriesLoading;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Calendar</h1>
        <p className="text-sm text-muted-foreground">
          Visual timeline of crew rotations and onboard periods.
        </p>
      </div>

      {/* Controls bar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Ship selector */}
        <Select value={selectedShipId} onValueChange={setSelectedShipId}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Select a ship" />
          </SelectTrigger>
          <SelectContent>
            {ships
              .filter((s) => s.is_active)
              .map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>

        {/* Month navigation */}
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon-sm" onClick={handlePrevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-[120px] text-center text-sm font-medium">
            {format(new Date(viewYear, viewMonth), "MMMM yyyy")}
          </div>
          <Button variant="outline" size="icon-sm" onClick={handleNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <Button variant="outline" size="sm" onClick={handleToday}>
          Today
        </Button>
      </div>

      {/* Timeline */}
      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : selectedShip ? (
        <div className="overflow-x-auto">
          <div className="min-w-[900px]">
            <ShipTimeline
              ship={selectedShip}
              employees={shipEmployees}
              crewChanges={shipCrewChanges}
              entries={allEntries}
              pendingRequests={shipRequests}
              weeks={weeks}
              today={today}
              onMoveHitch={handleMoveHitch}
            />
          </div>
        </div>
      ) : (
        <div className="rounded-lg border bg-card px-4 py-8 text-center text-sm text-muted-foreground">
          Select a ship to view the crew rotation calendar.
        </div>
      )}

      {/* Move Hitch Dialog */}
      <MoveHitchDialog
        open={hitchDialogOpen}
        onOpenChange={setHitchDialogOpen}
        employee={hitchEmployee}
        ship={selectedShip}
        today={today}
      />
    </div>
  );
}
