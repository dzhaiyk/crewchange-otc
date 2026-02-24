import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HELICOPTER_DAYS } from "@/types";
import type { DrillShip } from "@/types";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  helicopter_day: z.number().min(0).max(6),
  is_active: z.boolean(),
});

type FormData = z.infer<typeof schema>;

interface DrillShipFormProps {
  ship?: DrillShip | null;
  onSubmit: (data: FormData) => Promise<void>;
  onCancel: () => void;
}

export function DrillShipForm({ ship, onSubmit, onCancel }: DrillShipFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: ship?.name ?? "",
      helicopter_day: ship?.helicopter_day ?? 4,
      is_active: ship?.is_active ?? true,
    },
  });

  const helicopterDay = watch("helicopter_day");
  const isActive = watch("is_active");

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Ship name</Label>
        <Input id="name" {...register("name")} placeholder="e.g. Fatih" />
        {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
      </div>

      <div className="space-y-2">
        <Label>Helicopter day</Label>
        <Select
          value={String(helicopterDay)}
          onValueChange={(val) => setValue("helicopter_day", Number(val))}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {HELICOPTER_DAYS.map((day) => (
              <SelectItem key={day.value} value={String(day.value)}>
                {day.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <Switch
          checked={isActive}
          onCheckedChange={(checked) => setValue("is_active", checked)}
        />
        <Label>Active</Label>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : ship ? "Update" : "Create"}
        </Button>
      </div>
    </form>
  );
}
