import type { ActivityLog } from "@/types";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ActivityLogTableProps {
  logs: ActivityLog[];
}

const ACTION_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  created: "default",
  updated: "secondary",
  deleted: "destructive",
  approved: "default",
  denied: "destructive",
  batch_created: "default",
};

export function ActivityLogTable({ logs }: ActivityLogTableProps) {
  if (logs.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center text-muted-foreground">
        No activity logs found.
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Timestamp</TableHead>
          <TableHead>User</TableHead>
          <TableHead>Action</TableHead>
          <TableHead>Entity</TableHead>
          <TableHead>Entity ID</TableHead>
          <TableHead>Details</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {logs.map((log) => (
          <TableRow key={log.id}>
            <TableCell className="text-xs whitespace-nowrap">
              {new Date(log.created_at).toLocaleString()}
            </TableCell>
            <TableCell className="text-xs text-muted-foreground">
              {log.user_id ? log.user_id.slice(0, 8) + "..." : "System"}
            </TableCell>
            <TableCell>
              <Badge variant={ACTION_VARIANT[log.action] ?? "outline"} className="capitalize">
                {log.action}
              </Badge>
            </TableCell>
            <TableCell className="capitalize">{log.entity_type.replace(/_/g, " ")}</TableCell>
            <TableCell className="text-xs text-muted-foreground font-mono">
              {log.entity_id ? log.entity_id.slice(0, 8) + "..." : "—"}
            </TableCell>
            <TableCell className="max-w-64 truncate text-xs text-muted-foreground">
              {log.details ? JSON.stringify(log.details) : "—"}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
