import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { Employee, DrillShip } from "@/types";

const schema = z.object({
  original_date: z.string().min(1, "Original date is required"),
  requested_date: z.string().min(1, "Requested date is required"),
  reason: z.string().min(1, "Reason is required"),
});

type FormData = z.infer<typeof schema>;

interface ScheduleRequestFormProps {
  employee: Employee;
  ship: DrillShip | null;
  onSubmit: (data: {
    employee_id: string;
    drill_ship_id: string;
    original_date: string;
    requested_date: string;
    reason: string;
  }) => Promise<void>;
  onCancel: () => void;
}

export function ScheduleRequestForm({ employee, ship, onSubmit, onCancel }: ScheduleRequestFormProps) {
  const [conflictPreview, setConflictPreview] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const requestedDate = watch("requested_date");

  // Live conflict preview
  useEffect(() => {
    if (!requestedDate || !ship) {
      setConflictPreview(null);
      return;
    }

    supabase
      .from("schedule_requests")
      .select("id")
      .eq("drill_ship_id", ship.id)
      .eq("requested_date", requestedDate)
      .eq("status", "pending")
      .then(({ data }) => {
        if (data && data.length > 0) {
          setConflictPreview(`${data.length} other pending request(s) for this date on ${ship.name}`);
        } else {
          setConflictPreview(null);
        }
      });
  }, [requestedDate, ship]);

  const handleFormSubmit = async (data: FormData) => {
    if (!ship) return;
    await onSubmit({
      employee_id: employee.id,
      drill_ship_id: ship.id,
      ...data,
    });
  };

  if (!ship) {
    return (
      <Alert>
        <AlertDescription>You must be assigned to a ship to create a schedule request.</AlertDescription>
      </Alert>
    );
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      <div className="text-sm text-muted-foreground">
        Requesting as <span className="font-medium">{employee.full_name}</span> on{" "}
        <span className="font-medium">{ship.name}</span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="original_date">Original Date</Label>
          <Input id="original_date" type="date" {...register("original_date")} />
          {errors.original_date && (
            <p className="text-sm text-destructive">{errors.original_date.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="requested_date">Requested Date</Label>
          <Input id="requested_date" type="date" {...register("requested_date")} />
          {errors.requested_date && (
            <p className="text-sm text-destructive">{errors.requested_date.message}</p>
          )}
        </div>
      </div>

      {conflictPreview && (
        <Alert variant="destructive">
          <AlertDescription>{conflictPreview}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="reason">Reason</Label>
        <Input id="reason" {...register("reason")} placeholder="Why do you need this change?" />
        {errors.reason && (
          <p className="text-sm text-destructive">{errors.reason.message}</p>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Submitting..." : "Submit Request"}
        </Button>
      </div>
    </form>
  );
}
