import type { DrillShip } from "@/types";
import { HELICOPTER_DAYS } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Pencil, Trash2 } from "lucide-react";

interface DrillShipTableProps {
  ships: DrillShip[];
  onEdit: (ship: DrillShip) => void;
  onDelete: (ship: DrillShip) => void;
}

export function DrillShipTable({ ships, onEdit, onDelete }: DrillShipTableProps) {
  if (ships.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center text-muted-foreground">
        No drill ships found. Create one to get started.
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Helicopter Day</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="w-24">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {ships.map((ship) => (
          <TableRow key={ship.id}>
            <TableCell className="font-medium">{ship.name}</TableCell>
            <TableCell>
              {HELICOPTER_DAYS.find((d) => d.value === ship.helicopter_day)?.label ?? "Unknown"}
            </TableCell>
            <TableCell>
              <Badge variant={ship.is_active ? "default" : "secondary"}>
                {ship.is_active ? "Active" : "Inactive"}
              </Badge>
            </TableCell>
            <TableCell>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon-xs" onClick={() => onEdit(ship)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon-xs" onClick={() => onDelete(ship)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
