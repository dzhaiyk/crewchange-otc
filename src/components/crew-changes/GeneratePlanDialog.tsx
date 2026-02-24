import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { generateDefaultPlan, validatePlan, type ProposedCrewChange } from "@/lib/scheduler";
import { toIsoDate } from "@/lib/rotation";
import type { Employee, DrillShip, Role } from "@/types";

interface GeneratePlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ships: DrillShip[];
  employees: Employee[];
  roles: Role[];
  onSave: (plans: ProposedCrewChange[]) => Promise<void>;
}

export function GeneratePlanDialog({
  open,
  onOpenChange,
  ships,
  employees,
  roles,
  onSave,
}: GeneratePlanDialogProps) {
  const [shipId, setShipId] = useState("");
  const [startDate, setStartDate] = useState(toIsoDate(new Date()));
  const [count, setCount] = useState(1);
  const [plans, setPlans] = useState<ProposedCrewChange[]>([]);
  const [errors, setErrors] = useState<Array<{ date: string; message: string }>>([]);
  const [saving, setSaving] = useState(false);

  const selectedShip = ships.find((s) => s.id === shipId);

  const handleGenerate = () => {
    if (!selectedShip) return;

    const generated = generateDefaultPlan(employees, roles, selectedShip, startDate, count);
    setPlans(generated);

    // Validate all entries across all plans
    const allEntries = generated.flatMap((plan) =>
      plan.entries.map((e) => ({
        date: plan.scheduledDate,
        roleName: e.roleName,
        shift: e.shift,
      }))
    );
    setErrors(validatePlan(allEntries));
  };

  const handleSave = async () => {
    setSaving(true);
    await onSave(plans);
    setSaving(false);
    setPlans([]);
    onOpenChange(false);
  };

  const handleClose = () => {
    setPlans([]);
    setErrors([]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Generate Crew Change Plan</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label>Ship</Label>
            <Select value={shipId} onValueChange={setShipId}>
              <SelectTrigger>
                <SelectValue placeholder="Select ship" />
              </SelectTrigger>
              <SelectContent>
                {ships.filter((s) => s.is_active).map((ship) => (
                  <SelectItem key={ship.id} value={ship.id}>{ship.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="gen-start">Start Date</Label>
            <Input
              id="gen-start"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="gen-count">Rotations</Label>
            <Input
              id="gen-count"
              type="number"
              min={1}
              max={12}
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
            />
          </div>
        </div>

        <Button onClick={handleGenerate} disabled={!shipId} className="w-fit">
          Generate Preview
        </Button>

        {errors.length > 0 && (
          <Alert variant="destructive">
            <AlertDescription>
              <div className="font-medium">Constraint Warnings:</div>
              {errors.map((e, i) => (
                <div key={i}>{e.date}: {e.message}</div>
              ))}
            </AlertDescription>
          </Alert>
        )}

        {plans.length > 0 && (
          <div className="space-y-4">
            {plans.map((plan) => (
              <div key={plan.scheduledDate} className="space-y-2">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium">{plan.scheduledDate}</h4>
                  <Badge variant="outline">{plan.entries.length} entries</Badge>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Role</TableHead>
                      <TableHead>Shift</TableHead>
                      <TableHead>Outgoing</TableHead>
                      <TableHead>Incoming</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {plan.entries.map((entry, i) => (
                      <TableRow key={i}>
                        <TableCell>{entry.roleName}</TableCell>
                        <TableCell className="capitalize">{entry.shift}</TableCell>
                        <TableCell>{entry.outgoingEmployeeName ?? "—"}</TableCell>
                        <TableCell>{entry.incomingEmployeeName ?? "—"}</TableCell>
                      </TableRow>
                    ))}
                    {plan.entries.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground">
                          No matching employee pairs found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            ))}
          </div>
        )}

        {plans.length > 0 && (
          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save All"}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
