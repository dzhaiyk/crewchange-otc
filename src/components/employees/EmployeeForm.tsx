import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Employee, Role, DrillShip } from "@/types";

const schema = z.object({
  full_name: z.string().min(1, "Name is required"),
  username: z.string().min(1, "Username is required").regex(/^[a-zA-Z0-9._-]+$/, "Letters, numbers, dots, hyphens, underscores only"),
  password: z.string().optional(),
  role_id: z.string().min(1, "Role is required"),
  drill_ship_id: z.string().nullable(),
  shift: z.enum(["day", "night"]).nullable(),
  is_onboard: z.boolean(),
  is_active: z.boolean(),
});

type FormData = z.infer<typeof schema>;

interface EmployeeFormProps {
  employee?: Employee | null;
  roles: Role[];
  ships: DrillShip[];
  onSubmit: (data: FormData) => Promise<void>;
  onCancel: () => void;
}

export function EmployeeForm({ employee, roles, ships, onSubmit, onCancel }: EmployeeFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      full_name: employee?.full_name ?? "",
      username: employee?.username ?? "",
      password: "",
      role_id: employee?.role_id ?? "",
      drill_ship_id: employee?.drill_ship_id ?? null,
      shift: employee?.shift ?? null,
      is_onboard: employee?.is_onboard ?? false,
      is_active: employee?.is_active ?? true,
    },
  });

  const selectedRoleId = watch("role_id");
  const isOnboard = watch("is_onboard");
  const isActive = watch("is_active");

  const selectedRole = roles.find((r) => r.id === selectedRoleId);
  const isFieldRole = selectedRole?.is_field_role ?? false;

  // Clear field-specific values when switching to non-field role
  useEffect(() => {
    if (!isFieldRole) {
      setValue("drill_ship_id", null);
      setValue("shift", null);
      setValue("is_onboard", false);
    }
  }, [isFieldRole, setValue]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="full_name">Name</Label>
          <Input id="full_name" {...register("full_name")} placeholder="John Doe" />
          {errors.full_name && <p className="text-sm text-destructive">{errors.full_name.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="username">Username</Label>
          <Input id="username" {...register("username")} placeholder="john.doe" />
          {errors.username && <p className="text-sm text-destructive">{errors.username.message}</p>}
        </div>
      </div>

      {!employee && (
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" {...register("password")} placeholder="Set login password" />
          {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
          <p className="text-xs text-muted-foreground">Creates a login account for this employee. Min 6 characters.</p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Role</Label>
          <Select
            value={selectedRoleId}
            onValueChange={(val) => setValue("role_id", val)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select role" />
            </SelectTrigger>
            <SelectContent>
              {roles.map((role) => (
                <SelectItem key={role.id} value={role.id}>
                  {role.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.role_id && <p className="text-sm text-destructive">{errors.role_id.message}</p>}
        </div>
      </div>

      {isFieldRole && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Drill ship</Label>
            <Select
              value={watch("drill_ship_id") ?? ""}
              onValueChange={(val) => setValue("drill_ship_id", val || null)}
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
          </div>

          <div className="space-y-2">
            <Label>Shift</Label>
            <Select
              value={watch("shift") ?? ""}
              onValueChange={(val) => setValue("shift", (val || null) as "day" | "night" | null)}
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
      )}

      <div className="flex gap-6">
        {isFieldRole && (
          <div className="flex items-center gap-2">
            <Switch
              checked={isOnboard}
              onCheckedChange={(checked) => setValue("is_onboard", checked)}
            />
            <Label>Currently onboard</Label>
          </div>
        )}
        <div className="flex items-center gap-2">
          <Switch
            checked={isActive}
            onCheckedChange={(checked) => setValue("is_active", checked)}
          />
          <Label>Active</Label>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : employee ? "Update" : "Create"}
        </Button>
      </div>
    </form>
  );
}
