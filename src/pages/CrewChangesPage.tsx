import { useEffect, useState } from "react";
import { useCrewChangesStore } from "@/store/crew-changes-store";
import { useDrillShipsStore } from "@/store/drill-ships-store";
import { useRolesStore } from "@/store/roles-store";
import { useEmployeesStore } from "@/store/employees-store";
import { CrewChangeTable } from "@/components/crew-changes/CrewChangeTable";
import { CrewChangeForm } from "@/components/crew-changes/CrewChangeForm";
import { CrewChangeEntryTable } from "@/components/crew-changes/CrewChangeEntryTable";
import { CrewChangeEntryForm } from "@/components/crew-changes/CrewChangeEntryForm";
import { GeneratePlanDialog } from "@/components/crew-changes/GeneratePlanDialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Plus, Wand2, ArrowLeft } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { makeRoleKey } from "@/lib/constraints";
import type { CrewChange, CrewChangeEntry } from "@/types";
import type { ProposedCrewChange } from "@/lib/scheduler";

export function CrewChangesPage() {
  const {
    crewChanges,
    entries,
    loading,
    entriesLoading,
    filters,
    selectedCrewChangeId,
    setFilters,
    fetch,
    create,
    update,
    remove,
    selectCrewChange,
    createEntry,
    updateEntry,
    removeEntry,
    batchCreateEntries,
  } = useCrewChangesStore();

  const { ships, fetch: fetchShips } = useDrillShipsStore();
  const { roles, fetch: fetchRoles } = useRolesStore();
  const { employees, fetch: fetchEmployees } = useEmployeesStore();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CrewChange | null>(null);
  const [entryFormOpen, setEntryFormOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<CrewChangeEntry | null>(null);
  const [generateOpen, setGenerateOpen] = useState(false);

  // Entry counts for the table
  const [entryCounts, setEntryCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    fetch();
    fetchShips();
    fetchRoles();
    fetchEmployees();
  }, [fetch, fetchShips, fetchRoles, fetchEmployees]);

  // Fetch entry counts for display
  useEffect(() => {
    async function loadCounts() {
      const counts: Record<string, number> = {};
      for (const cc of crewChanges) {
        const { count } = await supabase
          .from("crew_change_entries")
          .select("id", { count: "exact", head: true })
          .eq("crew_change_id", cc.id);
        counts[cc.id] = count ?? 0;
      }
      setEntryCounts(counts);
    }
    if (crewChanges.length > 0) loadCounts();
  }, [crewChanges]);

  const selectedCrewChange = crewChanges.find((cc) => cc.id === selectedCrewChangeId);

  const handleCreateCC = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const handleEditCC = (cc: CrewChange) => {
    setEditing(cc);
    setFormOpen(true);
  };

  const handleDeleteCC = async (cc: CrewChange) => {
    const result = await remove(cc.id);
    if (result.error) toast.error(result.error);
    else toast.success("Crew change deleted");
  };

  const handleSubmitCC = async (data: {
    drill_ship_id: string;
    scheduled_date: string;
    status: CrewChange["status"];
    notes: string | null;
  }) => {
    if (editing) {
      const result = await update(editing.id, data);
      if (result.error) { toast.error(result.error); return; }
      toast.success("Crew change updated");
    } else {
      const result = await create(data);
      if (result.error) { toast.error(result.error); return; }
      toast.success("Crew change created");
    }
    setFormOpen(false);
  };

  // Entry handlers
  const handleCreateEntry = () => {
    setEditingEntry(null);
    setEntryFormOpen(true);
  };

  const handleEditEntry = (entry: CrewChangeEntry) => {
    setEditingEntry(entry);
    setEntryFormOpen(true);
  };

  const handleDeleteEntry = async (entry: CrewChangeEntry) => {
    const result = await removeEntry(entry.id);
    if (result.error) toast.error(result.error);
    else toast.success("Entry deleted");
  };

  const handleSubmitEntry = async (data: {
    role_id: string;
    shift: "day" | "night" | null;
    outgoing_employee_id: string | null;
    incoming_employee_id: string | null;
    is_early: boolean;
    is_late: boolean;
    days_delta: number;
    notes: string | null;
  }) => {
    if (!selectedCrewChangeId) return;

    if (editingEntry) {
      const result = await updateEntry(editingEntry.id, data);
      if (result.error) { toast.error(result.error); return; }
      toast.success("Entry updated");
    } else {
      const result = await createEntry({
        crew_change_id: selectedCrewChangeId,
        ...data,
      });
      if (result.error) { toast.error(result.error); return; }
      toast.success("Entry added");
    }
    setEntryFormOpen(false);
  };

  // Generate plan handler
  const handleSavePlan = async (plans: ProposedCrewChange[]) => {
    for (const plan of plans) {
      const result = await create({
        drill_ship_id: plan.drillShipId,
        scheduled_date: plan.scheduledDate,
        status: "planned",
      });
      if (result.error) {
        toast.error(`Failed to create crew change for ${plan.scheduledDate}: ${result.error}`);
        continue;
      }
      if (result.id && plan.entries.length > 0) {
        const entryData = plan.entries.map((e) => ({
          crew_change_id: result.id!,
          role_id: e.roleId,
          shift: e.shift as "day" | "night" | null,
          outgoing_employee_id: e.outgoingEmployeeId,
          incoming_employee_id: e.incomingEmployeeId,
          is_early: e.isEarly,
          is_late: e.isLate,
          days_delta: e.daysDelta,
        }));
        await batchCreateEntries(entryData);
      }
    }
    toast.success(`Generated ${plans.length} crew change(s)`);
  };

  // Build existing entries for constraint checking
  const existingEntryKeys = entries
    .filter((e) => e.role_id && e.shift)
    .map((e) => {
      const roleName = roles.find((r) => r.id === e.role_id)?.name ?? "";
      return {
        roleKey: makeRoleKey(roleName, e.shift as "day" | "night"),
        date: selectedCrewChange?.scheduled_date ?? "",
      };
    });

  // Detail view for a selected crew change
  if (selectedCrewChange) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => selectCrewChange(null)}>
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              Crew Change — {selectedCrewChange.scheduled_date}
            </h2>
            <p className="text-muted-foreground">
              {ships.find((s) => s.id === selectedCrewChange.drill_ship_id)?.name ?? "Unknown Ship"}
            </p>
          </div>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Entries</CardTitle>
            <Button size="sm" onClick={handleCreateEntry}>
              <Plus className="h-4 w-4" />
              Add Entry
            </Button>
          </CardHeader>
          <CardContent>
            {entriesLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (
              <CrewChangeEntryTable
                entries={entries}
                employees={employees}
                roles={roles}
                onEdit={handleEditEntry}
                onDelete={handleDeleteEntry}
              />
            )}
          </CardContent>
        </Card>

        <Dialog open={entryFormOpen} onOpenChange={setEntryFormOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingEntry ? "Edit Entry" : "Add Entry"}</DialogTitle>
            </DialogHeader>
            <CrewChangeEntryForm
              entry={editingEntry}
              employees={employees}
              roles={roles}
              crewChangeDate={selectedCrewChange.scheduled_date}
              existingEntries={existingEntryKeys}
              onSubmit={handleSubmitEntry}
              onCancel={() => setEntryFormOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // List view
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Crew Changes</h2>
          <p className="text-muted-foreground">Schedule and manage crew rotations</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setGenerateOpen(true)}>
            <Wand2 className="h-4 w-4" />
            Generate Plan
          </Button>
          <Button onClick={handleCreateCC}>
            <Plus className="h-4 w-4" />
            Add Crew Change
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select
          value={filters.shipId ?? "all"}
          onValueChange={(val) => setFilters({ ...filters, shipId: val === "all" ? undefined : val })}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All ships" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All ships</SelectItem>
            {ships.map((ship) => (
              <SelectItem key={ship.id} value={ship.id}>{ship.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.status ?? "all"}
          onValueChange={(val) =>
            setFilters({ ...filters, status: val === "all" ? undefined : val as CrewChange["status"] })
          }
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="planned">Planned</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : (
        <CrewChangeTable
          crewChanges={crewChanges}
          ships={ships}
          entryCounts={entryCounts}
          onEdit={handleEditCC}
          onDelete={handleDeleteCC}
          onSelect={(cc) => selectCrewChange(cc.id)}
        />
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Crew Change" : "Add Crew Change"}</DialogTitle>
          </DialogHeader>
          <CrewChangeForm
            crewChange={editing}
            ships={ships}
            onSubmit={handleSubmitCC}
            onCancel={() => setFormOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <GeneratePlanDialog
        open={generateOpen}
        onOpenChange={setGenerateOpen}
        ships={ships}
        employees={employees}
        roles={roles}
        onSave={handleSavePlan}
      />
    </div>
  );
}
