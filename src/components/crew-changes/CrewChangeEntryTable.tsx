import type { CrewChangeEntry, Employee, Role } from "@/types";
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
import { Pencil, Trash2 } from "lucide-react";

interface CrewChangeEntryTableProps {
  entries: CrewChangeEntry[];
  employees: Employee[];
  roles: Role[];
  onEdit: (entry: CrewChangeEntry) => void;
  onDelete: (entry: CrewChangeEntry) => void;
}

export function CrewChangeEntryTable({
  entries,
  employees,
  roles,
  onEdit,
  onDelete,
}: CrewChangeEntryTableProps) {
  const getEmployeeName = (id: string | null) =>
    id ? (employees.find((e) => e.id === id)?.full_name ?? "Unknown") : "—";

  const getRoleName = (roleId: string) =>
    roles.find((r) => r.id === roleId)?.name ?? "Unknown";

  if (entries.length === 0) {
    return (
      <div className="flex h-24 items-center justify-center text-muted-foreground">
        No entries yet. Add one or generate a plan.
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Role</TableHead>
          <TableHead>Shift</TableHead>
          <TableHead>Outgoing</TableHead>
          <TableHead>Incoming</TableHead>
          <TableHead>Flags</TableHead>
          <TableHead>Days Delta</TableHead>
          <TableHead className="w-24">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {entries.map((entry) => (
          <TableRow key={entry.id}>
            <TableCell>
              <Badge variant="outline">{getRoleName(entry.role_id)}</Badge>
            </TableCell>
            <TableCell className="capitalize">{entry.shift ?? "—"}</TableCell>
            <TableCell>{getEmployeeName(entry.outgoing_employee_id)}</TableCell>
            <TableCell>{getEmployeeName(entry.incoming_employee_id)}</TableCell>
            <TableCell>
              <div className="flex gap-1">
                {entry.is_early && <Badge variant="secondary">Early</Badge>}
                {entry.is_late && <Badge variant="secondary">Late</Badge>}
              </div>
            </TableCell>
            <TableCell>
              {entry.days_delta !== 0 ? (
                <span className={entry.days_delta > 0 ? "text-green-600" : "text-red-600"}>
                  {entry.days_delta > 0 ? "+" : ""}{entry.days_delta}
                </span>
              ) : (
                "0"
              )}
            </TableCell>
            <TableCell>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon-xs" onClick={() => onEdit(entry)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon-xs" onClick={() => onDelete(entry)}>
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
