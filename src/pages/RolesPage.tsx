import { useEffect, useState } from "react";
import { useRolesStore } from "@/store/roles-store";
import { RoleTable } from "@/components/roles/RoleTable";
import { RoleForm } from "@/components/roles/RoleForm";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import type { Role } from "@/types";

export function RolesPage() {
  const { roles, loading, fetch, create, update, remove } = useRolesStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Role | null>(null);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const handleCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const handleEdit = (role: Role) => {
    setEditing(role);
    setDialogOpen(true);
  };

  const handleDelete = async (role: Role) => {
    if (role.is_system_role) {
      toast.error("System roles cannot be deleted");
      return;
    }
    const result = await remove(role.id);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(`${role.name} deleted`);
    }
  };

  const handleSubmit = async (data: { name: string; description: string | null; is_field_role: boolean }) => {
    if (editing) {
      const result = await update(editing.id, data);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(`${data.name} updated`);
    } else {
      const result = await create(data);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(`${data.name} created`);
    }
    setDialogOpen(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Roles</h2>
          <p className="text-muted-foreground">Manage crew roles and access levels</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4" />
          Add Role
        </Button>
      </div>

      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : (
        <RoleTable roles={roles} onEdit={handleEdit} onDelete={handleDelete} />
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Role" : "Add Role"}</DialogTitle>
          </DialogHeader>
          <RoleForm
            role={editing}
            onSubmit={handleSubmit}
            onCancel={() => setDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
