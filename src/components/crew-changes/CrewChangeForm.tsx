import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { CrewChange, DrillShip } from "@/types";

const schema = z.object({
  drill_ship_id: z.string().min(1, "Ship is required"),
  scheduled_date: z.string().min(1, "Date is required"),
  status: z.enum(["planned", "confirmed", "completed", "cancelled"]),
  notes: z.string().nullable(),
});

type FormData = z.infer<typeof schema>;

interface CrewChangeFormProps {
  crewChange?: CrewChange | null;
  ships: DrillShip[];
  onSubmit: (data: FormData) => Promise<void>;
  onCancel: () => void;
}

export function CrewChangeForm({ crewChange, ships, onSubmit, onCancel }: CrewChangeFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      drill_ship_id: crewChange?.drill_ship_id ?? "",
      scheduled_date: crewChange?.scheduled_date ?? "",
      status: crewChange?.status ?? "planned",
      notes: crewChange?.notes ?? null,
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Ship</Label>
          <Select
            value={watch("drill_ship_id")}
            onValueChange={(val) => setValue("drill_ship_id", val)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select ship" />
            </SelectTrigger>
            <SelectContent>
              {ships.filter((s) => s.is_active).map((ship) => (
                <SelectItem key={ship.id} value={ship.id}>
                  {ship.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.drill_ship_id && (
            <p className="text-sm text-destructive">{errors.drill_ship_id.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="scheduled_date">Date</Label>
          <Input id="scheduled_date" type="date" {...register("scheduled_date")} />
          {errors.scheduled_date && (
            <p className="text-sm text-destructive">{errors.scheduled_date.message}</p>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Status</Label>
          <Select
            value={watch("status")}
            onValueChange={(val) => setValue("status", val as FormData["status"])}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="planned">Planned</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">Notes</Label>
          <Input
            id="notes"
            {...register("notes")}
            placeholder="Optional notes"
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : crewChange ? "Update" : "Create"}
        </Button>
      </div>
    </form>
  );
}
