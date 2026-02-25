import { PosBadge } from "./PosBadge";
import { getPositionConfig, type PositionKey } from "@/lib/positions";
import type { Employee } from "@/types";

export type ChipMode = "normal" | "dimmed" | "swap-out" | "swap-in";

interface PersonChipProps {
  employee: Employee;
  positionKey: PositionKey;
  mode?: ChipMode;
  onClick?: () => void;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export function PersonChip({
  employee,
  positionKey,
  mode = "normal",
  onClick,
}: PersonChipProps) {
  const config = getPositionConfig(positionKey);
  const initials = getInitials(employee.full_name);

  const isDimmed = mode === "dimmed";
  const isSwapOut = mode === "swap-out";
  const isSwapIn = mode === "swap-in";

  const borderClass = isSwapOut
    ? "border-2 border-dashed border-red-400"
    : isSwapIn
      ? "border-2 border-dashed border-green-400"
      : "border border-border";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-left transition-colors ${borderClass} ${isDimmed ? "opacity-45" : "hover:bg-accent/50"} ${onClick ? "cursor-pointer" : "cursor-default"}`}
    >
      {/* Avatar */}
      <div
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[11px] font-semibold text-white bg-gradient-to-br ${isDimmed ? "from-gray-400 to-gray-500" : config.gradient}`}
      >
        {initials}
      </div>

      {/* Name + badge */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-sm font-medium">{employee.full_name}</span>
          {isSwapOut && (
            <span className="shrink-0 rounded bg-red-500/15 px-1 text-[10px] font-semibold text-red-400">
              OUT
            </span>
          )}
          {isSwapIn && (
            <span className="shrink-0 rounded bg-green-500/15 px-1 text-[10px] font-semibold text-green-400">
              IN
            </span>
          )}
        </div>
        <PosBadge positionKey={positionKey} size="sm" />
      </div>
    </button>
  );
}
