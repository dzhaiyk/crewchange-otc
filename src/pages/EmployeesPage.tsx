import { useEffect, useState } from "react";
import { useEmployeesStore } from "@/store/employees-store";
import { useRolesStore } from "@/store/roles-store";
import { useDrillShipsStore } from "@/store/drill-ships-store";
import { useDayBalancesStore } from "@/store/day-balances-store";
import { EmployeeTable } from "@/components/employees/EmployeeTable";
import { EmployeeForm } from "@/components/employees/EmployeeForm";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import type { Employee } from "@/types/database";

export function EmployeesPage() {
  const { employees, loading, filters, setFilters, fetch, create, update, remove } = useEmployeesStore();
  const { roles, fetch: fetchRoles } = useRolesStore();
  const { ships, fetch: fetchShips } = useDrillShipsStore();
  const { summaries: balances, fetchSummaries } = useDayBalancesStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);

  useEffect(() => {
    fetch();
    fetchRoles();
    fetchShips();
  }, [fetch, fetchRoles, fetchShips]);

  // Fetch day balance summaries when employees change
  useEffect(() => {
    if (employees.length > 0) {
      fetchSummaries(employees.map((e) => e.id));
    }
  }, [employees, fetchSummaries]);

  const handleCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const handleEdit = (employee: Employee) => {
    setEditing(employee);
    setDialogOpen(true);
  };

  const handleDelete = async (employee: Employee) => {
    const result = await remove(employee.id);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(`${employee.full_name} deleted`);
    }
  };

  const handleSubmit = async (data: Record<string, unknown>) => {
    if (editing) {
      const result = await update(editing.id, data);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Employee updated");
    } else {
      const result = await create(data);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Employee created");
    }
    setDialogOpen(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Employees</h2>
          <p className="text-muted-foreground">Manage crew members and their assignments</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4" />
          Add Employee
        </Button>
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
          value={filters.roleId ?? "all"}
          onValueChange={(val) => setFilters({ ...filters, roleId: val === "all" ? undefined : val })}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            {roles.map((role) => (
              <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.isActive === undefined ? "all" : filters.isActive ? "active" : "inactive"}
          onValueChange={(val) =>
            setFilters({
              ...filters,
              isActive: val === "all" ? undefined : val === "active",
            })
          }
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
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
        <EmployeeTable
          employees={employees}
          roles={roles}
          ships={ships}
          balances={balances}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Employee" : "Add Employee"}</DialogTitle>
          </DialogHeader>
          <EmployeeForm
            employee={editing}
            roles={roles}
            ships={ships}
            onSubmit={handleSubmit}
            onCancel={() => setDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
