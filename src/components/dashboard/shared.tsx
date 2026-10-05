import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export const C = {
  bar: "var(--color-chart-bar)",
  line: "var(--color-chart-line)",
  area: "var(--color-chart-area)",
  warm: "var(--color-chart-warm)",
  teal: "var(--color-chart-teal)",
  grid: "var(--color-border)",
  axis: "var(--color-muted-foreground)",
};

export const axisProps = { stroke: C.axis, fontSize: 11, tickLine: false, axisLine: false } as const;
export const tooltipProps = {
  contentStyle: {
    background: "var(--color-popover)",
    border: "1px solid var(--color-border)",
    borderRadius: 10,
    boxShadow: "var(--shadow-card)",
    fontSize: 12,
  },
  labelStyle: { color: "var(--color-foreground)", fontWeight: 600 },
  cursor: { fill: "var(--color-muted)", opacity: 0.6 },
};

export function Panel({ title, subtitle, children, className, action }: { title: string; subtitle?: string; children: ReactNode; className?: string; action?: ReactNode }) {
  return (
    <section className={cn("panel animate-rise p-5", className)}>
      <header className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

export function StatCard({ label, value, unit, hint, icon, tone }: { label: string; value: ReactNode; unit?: string; hint?: string; icon: ReactNode; tone?: "default" | "good" | "warn" | "bad" }) {
  return (
    <div className="panel animate-rise flex flex-col gap-3 p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
        <span
          className={cn(
            "grid size-8 place-items-center rounded-lg",
            tone === "good" && "bg-status-good/15 text-status-good",
            tone === "warn" && "bg-status-warn/15 text-status-warn",
            tone === "bad" && "bg-status-bad/15 text-status-bad",
            (!tone || tone === "default") && "bg-primary/10 text-primary",
          )}
        >
          {icon}
        </span>
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-2xl font-bold tracking-tight text-foreground tabular-nums">{value}</span>
        {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
      </div>
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </div>
  );
}

export function heatColor(ratio: number) {
  const p = Math.round(Math.min(1, Math.max(0, ratio)) * 100);
  return `color-mix(in oklab, var(--color-primary) ${p}%, var(--color-muted))`;
}

export function LoadingGrid() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="panel h-28 animate-pulse" />
      ))}
      <div className="panel h-96 animate-pulse md:col-span-2 xl:col-span-5" />
    </div>
  );
}

export function downloadCsv(filename: string, rows: Record<string, string | number>[]) {
  if (!rows.length) return;
  const keys = Object.keys(rows[0]!);
  const csv = [keys.join(","), ...rows.map((r) => keys.map((k) => JSON.stringify(r[k] ?? "")).join(","))].join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
