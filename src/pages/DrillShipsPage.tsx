import { useEffect, useState } from "react";
import { useDrillShipsStore } from "@/store/drill-ships-store";
import { DrillShipTable } from "@/components/drillships/DrillShipTable";
import { DrillShipForm } from "@/components/drillships/DrillShipForm";
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
import type { DrillShip } from "@/types";

export function DrillShipsPage() {
  const { ships, loading, fetch, create, update, remove } = useDrillShipsStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<DrillShip | null>(null);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const handleCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const handleEdit = (ship: DrillShip) => {
    setEditing(ship);
    setDialogOpen(true);
  };

  const handleDelete = async (ship: DrillShip) => {
    const result = await remove(ship.id);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(`${ship.name} deleted`);
    }
  };

  const handleSubmit = async (data: { name: string; helicopter_day: number; is_active: boolean }) => {
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
          <h2 className="text-2xl font-bold tracking-tight">Drill Ships</h2>
          <p className="text-muted-foreground">Manage drill ships and helicopter schedules</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4" />
          Add Ship
        </Button>
      </div>

      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : (
        <DrillShipTable ships={ships} onEdit={handleEdit} onDelete={handleDelete} />
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Ship" : "Add Ship"}</DialogTitle>
          </DialogHeader>
          <DrillShipForm
            ship={editing}
            onSubmit={handleSubmit}
            onCancel={() => setDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
