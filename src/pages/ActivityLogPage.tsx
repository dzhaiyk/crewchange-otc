import { useEffect } from "react";
import { useActivityLogStore } from "@/store/activity-log-store";
import { ActivityLogTable } from "@/components/activity-log/ActivityLogTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight } from "lucide-react";

const ENTITY_TYPES = [
  "employee",
  "drill_ship",
  "role",
  "crew_change",
  "crew_change_entry",
  "crew_change_entries",
  "schedule_request",
  "day_balance",
];

export function ActivityLogPage() {
  const { logs, loading, page, hasMore, filters, setFilters, fetch, nextPage, prevPage } =
    useActivityLogStore();

  useEffect(() => {
    fetch();
  }, [fetch]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Activity Log</h2>
        <p className="text-muted-foreground">Audit trail of all system operations</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select
          value={filters.entityType ?? "all"}
          onValueChange={(val) =>
            setFilters({ ...filters, entityType: val === "all" ? undefined : val })
          }
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All entities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All entities</SelectItem>
            {ENTITY_TYPES.map((type) => (
              <SelectItem key={type} value={type} className="capitalize">
                {type.replace(/_/g, " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          type="date"
          placeholder="From"
          value={filters.dateFrom ?? ""}
          onChange={(e) =>
            setFilters({ ...filters, dateFrom: e.target.value || undefined })
          }
          className="w-40"
        />

        <Input
          type="date"
          placeholder="To"
          value={filters.dateTo ?? ""}
          onChange={(e) =>
            setFilters({ ...filters, dateTo: e.target.value || undefined })
          }
          className="w-40"
        />
      </div>

      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : (
        <ActivityLogTable logs={logs} />
      )}

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Page {page + 1} {logs.length > 0 ? `(${logs.length} entries)` : ""}
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={prevPage} disabled={page === 0}>
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <Button variant="outline" size="sm" onClick={nextPage} disabled={!hasMore}>
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
