import type { Employee, Role, DrillShip } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DayBalanceSummary } from "@/components/day-balances/DayBalanceSummary";
import { Pencil, Trash2 } from "lucide-react";

interface EmployeeTableProps {
  employees: Employee[];
  roles: Role[];
  ships: DrillShip[];
  balances?: Map<string, number>;
  onEdit: (employee: Employee) => void;
  onDelete: (employee: Employee) => void;
}

export function EmployeeTable({ employees, roles, ships, balances, onEdit, onDelete }: EmployeeTableProps) {
  const getRoleName = (roleId: string) =>
    roles.find((r) => r.id === roleId)?.name ?? "Unknown";

  const getShipName = (shipId: string | null) =>
    shipId ? (ships.find((s) => s.id === shipId)?.name ?? "Unknown") : "—";

  if (employees.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center text-muted-foreground">
        No employees found. Create one to get started.
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Username</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Ship</TableHead>
          <TableHead>Shift</TableHead>
          <TableHead>Balance</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="w-24">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {employees.map((emp) => (
          <TableRow key={emp.id}>
            <TableCell className="font-medium">{emp.full_name}</TableCell>
            <TableCell className="text-muted-foreground">{emp.username}</TableCell>
            <TableCell>
              <Badge variant="outline">{getRoleName(emp.role_id)}</Badge>
            </TableCell>
            <TableCell>{getShipName(emp.drill_ship_id)}</TableCell>
            <TableCell className="capitalize">{emp.shift ?? "—"}</TableCell>
            <TableCell>
              <DayBalanceSummary balance={balances?.get(emp.id) ?? 0} />
            </TableCell>
            <TableCell>
              <div className="flex gap-1">
                {emp.is_active ? (
                  <Badge variant="default">Active</Badge>
                ) : (
                  <Badge variant="secondary">Inactive</Badge>
                )}
                {emp.is_onboard && (
                  <Badge variant="outline">Onboard</Badge>
                )}
              </div>
            </TableCell>
            <TableCell>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon-xs" onClick={() => onEdit(emp)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon-xs" onClick={() => onDelete(emp)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
