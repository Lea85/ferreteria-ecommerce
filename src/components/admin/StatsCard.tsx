import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type StatsCardProps = {
  title: string;
  value: string;
  icon: LucideIcon;
  trend?: number;
  trendLabel?: string;
  className?: string;
};

export function StatsCard({
  title,
  value,
  icon: Icon,
  trend,
  trendLabel,
  className,
}: StatsCardProps) {
  const up = trend !== undefined && trend >= 0;

  return (
    <Card
      className={cn(
        "border-border shadow-sm transition-shadow hover:shadow-md",
        className,
      )}
    >
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <span className="text-sm font-medium text-muted-foreground">
          {title}
        </span>
        <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-5" />
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold tracking-tight text-foreground">
          {value}
        </p>
        {trend !== undefined && (
          <p
            className={cn(
              "mt-2 flex items-center gap-1 text-xs font-medium",
              up ? "text-emerald-600" : "text-red-600",
            )}
          >
            {up ? (
              <ArrowUpRight className="size-3.5" />
            ) : (
              <ArrowDownRight className="size-3.5" />
            )}
            {Math.abs(trend)}% {trendLabel ?? "vs. período anterior"}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
