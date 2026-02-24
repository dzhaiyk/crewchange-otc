import { Badge } from "@/components/ui/badge";

interface DayBalanceSummaryProps {
  balance: number;
}

export function DayBalanceSummary({ balance }: DayBalanceSummaryProps) {
  if (balance === 0) {
    return <span className="text-muted-foreground">0</span>;
  }

  const isPositive = balance > 0;

  return (
    <Badge variant={isPositive ? "default" : "destructive"} className="tabular-nums">
      {isPositive ? "+" : ""}{balance}d
    </Badge>
  );
}
