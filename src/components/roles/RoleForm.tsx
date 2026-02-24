import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { Role } from "@/types";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().nullable(),
  is_field_role: z.boolean(),
});

type FormData = z.infer<typeof schema>;

interface RoleFormProps {
  role?: Role | null;
  onSubmit: (data: FormData) => Promise<void>;
  onCancel: () => void;
}

export function RoleForm({ role, onSubmit, onCancel }: RoleFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: role?.name ?? "",
      description: role?.description ?? "",
      is_field_role: role?.is_field_role ?? false,
    },
  });

  const isFieldRole = watch("is_field_role");

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Role name</Label>
        <Input
          id="name"
          {...register("name")}
          placeholder="e.g. Toolpusher"
          disabled={role?.is_system_role}
        />
        {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
        {role?.is_system_role && (
          <p className="text-xs text-muted-foreground">System role names cannot be changed</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Input
          id="description"
          {...register("description")}
          placeholder="Optional description"
        />
      </div>

      <div className="flex items-center gap-2">
        <Switch
          checked={isFieldRole}
          onCheckedChange={(checked) => setValue("is_field_role", checked)}
        />
        <Label>Field role (assigned to ships with shifts)</Label>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : role ? "Update" : "Create"}
        </Button>
      </div>
    </form>
  );
}
