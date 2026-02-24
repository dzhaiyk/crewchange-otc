import type { CrewChange, DrillShip } from "@/types";
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
import { Pencil, Trash2, ChevronRight } from "lucide-react";

const STATUS_VARIANT: Record<CrewChange["status"], "default" | "secondary" | "outline" | "destructive"> = {
  planned: "outline",
  confirmed: "default",
  completed: "secondary",
  cancelled: "destructive",
};

interface CrewChangeTableProps {
  crewChanges: CrewChange[];
  ships: DrillShip[];
  entryCounts: Record<string, number>;
  onEdit: (cc: CrewChange) => void;
  onDelete: (cc: CrewChange) => void;
  onSelect: (cc: CrewChange) => void;
}

export function CrewChangeTable({
  crewChanges,
  ships,
  entryCounts,
  onEdit,
  onDelete,
  onSelect,
}: CrewChangeTableProps) {
  const getShipName = (shipId: string) =>
    ships.find((s) => s.id === shipId)?.name ?? "Unknown";

  if (crewChanges.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center text-muted-foreground">
        No crew changes found. Create one to get started.
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Ship</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Entries</TableHead>
          <TableHead>Notes</TableHead>
          <TableHead className="w-32">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {crewChanges.map((cc) => (
          <TableRow key={cc.id} className="cursor-pointer" onClick={() => onSelect(cc)}>
            <TableCell className="font-medium">{cc.scheduled_date}</TableCell>
            <TableCell>{getShipName(cc.drill_ship_id)}</TableCell>
            <TableCell>
              <Badge variant={STATUS_VARIANT[cc.status]} className="capitalize">
                {cc.status}
              </Badge>
            </TableCell>
            <TableCell>{entryCounts[cc.id] ?? 0}</TableCell>
            <TableCell className="max-w-48 truncate text-muted-foreground">
              {cc.notes ?? "—"}
            </TableCell>
            <TableCell>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={(e) => { e.stopPropagation(); onEdit(cc); }}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={(e) => { e.stopPropagation(); onDelete(cc); }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon-xs">
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
