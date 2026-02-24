import type { ScheduleRequest, Employee, DrillShip } from "@/types";
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
import { Check, X } from "lucide-react";

const STATUS_VARIANT: Record<ScheduleRequest["status"], "default" | "secondary" | "outline" | "destructive"> = {
  pending: "outline",
  approved: "default",
  denied: "destructive",
};

interface ScheduleRequestTableProps {
  requests: ScheduleRequest[];
  employees: Employee[];
  ships: DrillShip[];
  canReview: boolean;
  onReview?: (request: ScheduleRequest, status: "approved" | "denied") => void;
}

export function ScheduleRequestTable({
  requests,
  employees,
  ships,
  canReview,
  onReview,
}: ScheduleRequestTableProps) {
  const getEmployeeName = (id: string) =>
    employees.find((e) => e.id === id)?.full_name ?? "Unknown";

  const getShipName = (id: string) =>
    ships.find((s) => s.id === id)?.name ?? "Unknown";

  if (requests.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center text-muted-foreground">
        No schedule requests found.
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Employee</TableHead>
          <TableHead>Ship</TableHead>
          <TableHead>Original Date</TableHead>
          <TableHead>Requested Date</TableHead>
          <TableHead>Reason</TableHead>
          <TableHead>Conflict</TableHead>
          <TableHead>Status</TableHead>
          {canReview && <TableHead className="w-24">Actions</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {requests.map((req) => (
          <TableRow key={req.id}>
            <TableCell className="font-medium">{getEmployeeName(req.employee_id)}</TableCell>
            <TableCell>{getShipName(req.drill_ship_id)}</TableCell>
            <TableCell>{req.original_date}</TableCell>
            <TableCell>{req.requested_date}</TableCell>
            <TableCell className="max-w-48 truncate">{req.reason}</TableCell>
            <TableCell>
              {req.has_conflict ? (
                <Badge variant="destructive" className="text-xs">Conflict</Badge>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </TableCell>
            <TableCell>
              <Badge variant={STATUS_VARIANT[req.status]} className="capitalize">
                {req.status}
              </Badge>
            </TableCell>
            {canReview && (
              <TableCell>
                {req.status === "pending" && onReview && (
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      className="text-green-600"
                      onClick={() => onReview(req, "approved")}
                    >
                      <Check className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      className="text-red-600"
                      onClick={() => onReview(req, "denied")}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
