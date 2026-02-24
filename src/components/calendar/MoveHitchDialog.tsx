import { useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { fromIsoDate } from "@/lib/rotation";
import { shiftCrewChangeDate, getNextCrewChangeDate } from "@/lib/calendar";
import { useScheduleRequestsStore } from "@/store/schedule-requests-store";
import type { Employee, DrillShip } from "@/types";

interface MoveHitchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: Employee | null;
  ship: DrillShip | null;
  today: string;
}

const WEEK_OPTIONS = [1, 2, 3] as const;

export function MoveHitchDialog({
  open,
  onOpenChange,
  employee,
  ship,
  today,
}: MoveHitchDialogProps) {
  const createRequest = useScheduleRequestsStore((s) => s.create);
  const [submitting, setSubmitting] = useState<number | null>(null);

  if (!employee || !ship) return null;

  const nextDate = getNextCrewChangeDate(employee, ship.helicopter_day, today);

  const handleMove = async (weeks: number) => {
    if (!nextDate) return;

    setSubmitting(weeks);

    const newDate = shiftCrewChangeDate(nextDate, weeks, ship.helicopter_day);

    const result = await createRequest({
      employee_id: employee.id,
      drill_ship_id: ship.id,
      original_date: nextDate,
      requested_date: newDate,
      reason: `Hitch move: +${weeks} week${weeks > 1 ? "s" : ""}`,
    });

    setSubmitting(null);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(
        `Request submitted: move to ${format(fromIsoDate(newDate), "MMM d, yyyy")}`,
      );
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Move Hitch</DialogTitle>
          <DialogDescription>
            {employee.full_name} — {ship.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {nextDate ? (
            <>
              <div className="text-sm text-muted-foreground">
                Next crew change:{" "}
                <span className="font-medium text-foreground">
                  {format(fromIsoDate(nextDate), "EEEE, MMM d, yyyy")}
                </span>
              </div>

              <div className="text-sm font-medium">Move hitch by:</div>

              <div className="flex gap-2">
                {WEEK_OPTIONS.map((weeks) => {
                  const newDate = shiftCrewChangeDate(
                    nextDate,
                    weeks,
                    ship.helicopter_day,
                  );
                  return (
                    <Button
                      key={weeks}
                      variant="outline"
                      className="flex-1 flex-col h-auto py-3"
                      disabled={submitting !== null}
                      onClick={() => handleMove(weeks)}
                    >
                      <span className="font-semibold">
                        +{weeks} Week{weeks > 1 ? "s" : ""}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {format(fromIsoDate(newDate), "MMM d")}
                      </span>
                    </Button>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="text-sm text-muted-foreground">
              No rotation start date set for this employee. A rotation start date
              is required to calculate crew change dates.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
