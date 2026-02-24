import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { validateCrewChangeDay, makeRoleKey } from "@/lib/constraints";
import type { CrewChangeEntry, Employee, Role } from "@/types";

const schema = z.object({
  role_id: z.string().min(1, "Role is required"),
  shift: z.enum(["day", "night"]).nullable(),
  outgoing_employee_id: z.string().nullable(),
  incoming_employee_id: z.string().nullable(),
  is_early: z.boolean(),
  is_late: z.boolean(),
  days_delta: z.number(),
  notes: z.string().nullable(),
});

type FormData = z.infer<typeof schema>;

interface CrewChangeEntryFormProps {
  entry?: CrewChangeEntry | null;
  employees: Employee[];
  roles: Role[];
  crewChangeDate: string;
  existingEntries: Array<{ roleKey: string; date: string }>;
  onSubmit: (data: FormData) => Promise<void>;
  onCancel: () => void;
}

export function CrewChangeEntryForm({
  entry,
  employees,
  roles,
  crewChangeDate,
  existingEntries,
  onSubmit,
  onCancel,
}: CrewChangeEntryFormProps) {
  const [warnings, setWarnings] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      role_id: entry?.role_id ?? "",
      shift: entry?.shift ?? null,
      outgoing_employee_id: entry?.outgoing_employee_id ?? null,
      incoming_employee_id: entry?.incoming_employee_id ?? null,
      is_early: entry?.is_early ?? false,
      is_late: entry?.is_late ?? false,
      days_delta: entry?.days_delta ?? 0,
      notes: entry?.notes ?? null,
    },
  });

  const selectedRoleId = watch("role_id");
  const selectedShift = watch("shift");
  const isEarly = watch("is_early");
  const isLate = watch("is_late");

  const fieldRoles = roles.filter((r) => r.is_field_role);

  const handleFormSubmit = async (data: FormData) => {
    // Validate constraints before submit
    if (data.role_id && data.shift) {
      const roleName = roles.find((r) => r.id === data.role_id)?.name ?? "";
      const roleKey = makeRoleKey(roleName, data.shift);
      const conflicts = validateCrewChangeDay(roleKey, crewChangeDate, existingEntries);
      if (conflicts.length > 0) {
        setWarnings(conflicts);
        // Show warnings but still allow submit
      }
    }
    await onSubmit(data);
  };

  // Live constraint preview
  const checkConstraints = () => {
    if (!selectedRoleId || !selectedShift) {
      setWarnings([]);
      return;
    }
    const roleName = roles.find((r) => r.id === selectedRoleId)?.name ?? "";
    const roleKey = makeRoleKey(roleName, selectedShift);
    const conflicts = validateCrewChangeDay(roleKey, crewChangeDate, existingEntries);
    setWarnings(conflicts);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Role</Label>
          <Select
            value={selectedRoleId}
            onValueChange={(val) => { setValue("role_id", val); setTimeout(checkConstraints, 0); }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select role" />
            </SelectTrigger>
            <SelectContent>
              {fieldRoles.map((role) => (
                <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.role_id && <p className="text-sm text-destructive">{errors.role_id.message}</p>}
        </div>

        <div className="space-y-2">
          <Label>Shift</Label>
          <Select
            value={selectedShift ?? ""}
            onValueChange={(val) => {
              setValue("shift", (val || null) as "day" | "night" | null);
              setTimeout(checkConstraints, 0);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select shift" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Day</SelectItem>
              <SelectItem value="night">Night</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {warnings.length > 0 && (
        <Alert variant="destructive">
          <AlertDescription>
            {warnings.map((w, i) => <div key={i}>{w}</div>)}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Outgoing Employee</Label>
          <Select
            value={watch("outgoing_employee_id") ?? "none"}
            onValueChange={(val) => setValue("outgoing_employee_id", val === "none" ? null : val)}
          >
            <SelectTrigger>
              <SelectValue placeholder="None" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {employees.filter((e) => e.is_active).map((emp) => (
                <SelectItem key={emp.id} value={emp.id}>{emp.full_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Incoming Employee</Label>
          <Select
            value={watch("incoming_employee_id") ?? "none"}
            onValueChange={(val) => setValue("incoming_employee_id", val === "none" ? null : val)}
          >
            <SelectTrigger>
              <SelectValue placeholder="None" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {employees.filter((e) => e.is_active).map((emp) => (
                <SelectItem key={emp.id} value={emp.id}>{emp.full_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-wrap gap-6">
        <div className="flex items-center gap-2">
          <Switch
            checked={isEarly}
            onCheckedChange={(checked) => setValue("is_early", checked)}
          />
          <Label>Early Relief</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            checked={isLate}
            onCheckedChange={(checked) => setValue("is_late", checked)}
          />
          <Label>Late Join</Label>
        </div>
      </div>

      {(isEarly || isLate) && (
        <div className="space-y-2">
          <Label htmlFor="days_delta">Days Delta</Label>
          <Input
            id="days_delta"
            type="number"
            {...register("days_delta", { valueAsNumber: true })}
          />
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Input id="notes" {...register("notes")} placeholder="Optional notes" />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : entry ? "Update" : "Add Entry"}
        </Button>
      </div>
    </form>
  );
}
