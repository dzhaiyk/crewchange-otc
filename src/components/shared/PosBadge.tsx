import { getPositionConfig, type PositionKey } from "@/lib/positions";

interface PosBadgeProps {
  positionKey: PositionKey;
  size?: "sm" | "md";
}

export function PosBadge({ positionKey, size = "sm" }: PosBadgeProps) {
  const config = getPositionConfig(positionKey);
  const textSize = size === "sm" ? "text-[10px]" : "text-xs";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 font-medium ${textSize}`}
      style={{ backgroundColor: `${config.colorHex}20`, color: config.colorHex }}
    >
      <span
        className="inline-block h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: config.colorHex }}
      />
      <span>{config.icon}</span>
      <span>{config.label}</span>
    </span>
  );
}
