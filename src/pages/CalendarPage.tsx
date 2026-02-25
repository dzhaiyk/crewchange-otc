import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ViewSwitcher, type ViewMode } from "@/components/shared/ViewSwitcher";
import { CrewCards } from "@/components/calendar/CrewCards";
import { CalendarView } from "@/components/calendar/CalendarView";
import { TimelineView } from "@/components/calendar/TimelineView";
import { BottomPanels } from "@/components/calendar/BottomPanels";
import { MoveHitchDialog } from "@/components/calendar/MoveHitchDialog";
import { buildCrewRoster } from "@/lib/crew-roster";
import { toIsoDate, addDays, getDayOfWeek } from "@/lib/rotation";
import { supabase } from "@/lib/supabase";
import { useDrillShipsStore } from "@/store/drill-ships-store";
import { useEmployeesStore } from "@/store/employees-store";
import { useRolesStore } from "@/store/roles-store";
import { useCrewChangesStore } from "@/store/crew-changes-store";
import { useScheduleRequestsStore } from "@/store/schedule-requests-store";
import { useAuth } from "@/hooks/use-auth";
import type { Employee, CrewChangeEntry } from "@/types";

export function CalendarPage() {
  const { employee: currentEmployee, isAdmin, isManager } = useAuth();

  // Stores
  const { ships, fetch: fetchShips, loading: shipsLoading } = useDrillShipsStore();
  const { employees, fetch: fetchEmployees, loading: employeesLoading } = useEmployeesStore();
  const { roles, fetch: fetchRoles } = useRolesStore();
  const { crewChanges, fetch: fetchCrewChanges } = useCrewChangesStore();
  const { fetch: fetchRequests } = useScheduleRequestsStore();

  // Local state
  const [selectedShipId, setSelectedShipId] = useState<string>("");
  const [viewMode, setViewMode] = useState<ViewMode>("calendar");
  const [selectedDate, setSelectedDate] = useState(() => toIsoDate(new Date()));
  const [viewYear, setViewYear] = useState(() => new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth());
  const [allEntries, setAllEntries] = useState<CrewChangeEntry[]>([]);
  const [entriesLoading, setEntriesLoading] = useState(false);
  const [hitchDialogOpen, setHitchDialogOpen] = useState(false);
  const [hitchEmployee, setHitchEmployee] = useState<Employee | null>(null);

  const today = toIsoDate(new Date());

  // Compute a wide range for roster building (current year ± buffer)
  const rangeStart = `${viewYear}-01-01`;
  const rangeEnd = `${viewYear}-12-31`;

  // --- Initial data fetch ---
  useEffect(() => {
    fetchShips();
    fetchEmployees();
    fetchRoles();
    fetchCrewChanges();
    fetchRequests();
  }, [fetchShips, fetchEmployees, fetchRoles, fetchCrewChanges, fetchRequests]);

  // Auto-select ship
  useEffect(() => {
    if (selectedShipId) return;
    if (currentEmployee?.drill_ship_id) {
      setSelectedShipId(currentEmployee.drill_ship_id);
    } else if (ships.length > 0) {
      const active = ships.find((s) => s.is_active);
      if (active) setSelectedShipId(active.id);
    }
  }, [ships, currentEmployee, selectedShipId]);

  // Fetch crew change entries
  useEffect(() => {
    if (!selectedShipId || crewChanges.length === 0) {
      setAllEntries([]);
      return;
    }

    const shipCCs = crewChanges.filter(
      (cc) =>
        cc.drill_ship_id === selectedShipId &&
        cc.scheduled_date >= rangeStart &&
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
  }, [selectedShipId, crewChanges, rangeStart, rangeEnd]);

  // --- Derived data ---
  const selectedShip = ships.find((s) => s.id === selectedShipId) ?? null;

  const shipEmployees = useMemo(
    () => employees.filter((e) => e.drill_ship_id === selectedShipId && e.is_active),
    [employees, selectedShipId],
  );

  const shipCrewChanges = useMemo(
    () => crewChanges.filter((cc) => cc.drill_ship_id === selectedShipId),
    [crewChanges, selectedShipId],
  );

  // Build crew roster
  const roster = useMemo(
    () =>
      buildCrewRoster(shipEmployees, roles, shipCrewChanges, allEntries, rangeStart, rangeEnd),
    [shipEmployees, roles, shipCrewChanges, allEntries, rangeStart, rangeEnd],
  );

  // Timeline start date: Monday of the current week
  const timelineStartDate = useMemo(() => {
    const dow = getDayOfWeek(today); // 0=Sun
    const mondayOffset = (dow === 0 ? 6 : dow - 1);
    return addDays(today, -mondayOffset);
  }, [today]);

  // --- Handlers ---
  const handleMonthChange = useCallback((y: number, m: number) => {
    setViewYear(y);
    setViewMonth(m);
  }, []);

  const handlePersonClick = useCallback(
    (emp: Employee) => {
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
          Crew rotation calendar with monthly and timeline views.
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

        {/* View switcher */}
        <ViewSwitcher view={viewMode} onChange={setViewMode} />
      </div>

      {/* Main content */}
      {loading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-32 rounded-xl" />
            <Skeleton className="h-32 rounded-xl" />
          </div>
          <Skeleton className="h-96 rounded-xl" />
        </div>
      ) : selectedShip ? (
        <>
          {/* Crew status cards */}
          <CrewCards
            selectedDate={selectedDate}
            roster={roster}
            onPersonClick={handlePersonClick}
          />

          {/* Calendar or Timeline view */}
          {viewMode === "calendar" ? (
            <CalendarView
              year={viewYear}
              month={viewMonth}
              roster={roster}
              helicopterDay={selectedShip.helicopter_day}
              today={today}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              onMonthChange={handleMonthChange}
            />
          ) : (
            <TimelineView
              roster={roster}
              fieldEmployees={roster.fieldEmployees}
              roles={roles}
              startDate={timelineStartDate}
              today={today}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
            />
          )}

          {/* Bottom info panels */}
          <BottomPanels
            selectedDate={selectedDate}
            roster={roster}
            fieldEmployees={roster.fieldEmployees}
            roles={roles}
            ship={selectedShip}
            today={today}
          />
        </>
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
