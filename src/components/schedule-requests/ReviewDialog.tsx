import type { ScheduleRequest, Employee, DrillShip } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface ReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: ScheduleRequest | null;
  employees: Employee[];
  ships: DrillShip[];
  onApprove: () => void;
  onDeny: () => void;
  loading: boolean;
}

export function ReviewDialog({
  open,
  onOpenChange,
  request,
  employees,
  ships,
  onApprove,
  onDeny,
  loading,
}: ReviewDialogProps) {
  if (!request) return null;

  const employee = employees.find((e) => e.id === request.employee_id);
  const ship = ships.find((s) => s.id === request.drill_ship_id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Review Schedule Request</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-2">
            <div className="text-muted-foreground">Employee</div>
            <div className="font-medium">{employee?.full_name ?? "Unknown"}</div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="text-muted-foreground">Ship</div>
            <div>{ship?.name ?? "Unknown"}</div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="text-muted-foreground">Original Date</div>
            <div>{request.original_date}</div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="text-muted-foreground">Requested Date</div>
            <div>{request.requested_date}</div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="text-muted-foreground">Reason</div>
            <div>{request.reason}</div>
          </div>
          {request.has_conflict && (
            <div className="grid grid-cols-2 gap-2">
              <div className="text-muted-foreground">Conflict</div>
              <div>
                <Badge variant="destructive">{request.conflict_details ?? "Conflict detected"}</Badge>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onDeny} disabled={loading}>
            Deny
          </Button>
          <Button onClick={onApprove} disabled={loading}>
            {loading ? "Processing..." : "Approve"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
