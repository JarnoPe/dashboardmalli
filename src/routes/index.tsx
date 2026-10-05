import { createFileRoute } from "@tanstack/react-router";
import { Download, FileDown, Activity } from "lucide-react";
import { DashboardProvider, useDashboard } from "@/lib/dashboard-store";
import { FEATURED_HORSES, STABLES, type StableName } from "@/lib/mock-data";
import { getHorseData, getSleipData, getStableData, type RangeKey } from "@/lib/api";
import { fmtDay } from "@/lib/analytics";
import { HorseView } from "@/components/dashboard/HorseView";
import { StableView } from "@/components/dashboard/StableView";
import { SleipView } from "@/components/dashboard/SleipView";
import { downloadCsv } from "@/components/dashboard/shared";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Hevosten hyvinvoinnin mittaristo — KP AlkIoT" },
      { name: "description", content: "Hevosten hyvinvoinnin, tallin ilmanlaadun ja liikkeen seurannan KP AlkIoT -demo." },
      { property: "og:title", content: "Hevosten hyvinvoinnin mittaristo — KP AlkIoT" },
      { property: "og:description", content: "Tallin ilmanlaadun, juomisen ja hevosten liikkeen seuranta yhdessä näkymässä." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <DashboardProvider>
      <Dashboard />
    </DashboardProvider>
  ),
});

const RANGES: { key: RangeKey; label: string }[] = [
  { key: "24h", label: "Viimeiset 24 tuntia" },
  { key: "7d", label: "Viimeiset 7 päivää" },
  { key: "30d", label: "Viimeiset 30 päivää" },
  { key: "custom", label: "Mukautettu jakso" },
];

function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { key: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="inline-flex flex-wrap rounded-lg bg-muted p-1">
      {options.map((o) => (
        <button key={o.key} onClick={() => onChange(o.key)}
          className={cn("rounded-md px-3 py-1.5 text-sm font-medium transition-all",
            value === o.key ? "bg-card text-foreground shadow-card" : "text-muted-foreground hover:text-foreground")}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Dashboard() {
  const d = useDashboard();

  const exportCsv = () => {
    if (d.view === "horse") {
      const rows = getHorseData(d.horse, d.from, d.to).events.map((e) => ({ horse: e.horse, timestamp: e.timestamp, volumeLitres: e.volumeLitres, durationSeconds: e.durationSeconds }));
      downloadCsv(`${d.horse}-drinking-events.csv`, rows);
    } else if (d.view === "stable") {
      const rows = getStableData(d.stable, d.from, d.to).envSeries.map((e) => ({ aika: e.label, lampotilaC: e.temperature, ilmankosteusProsenttia: e.humidity, co2Ppm: e.co2, ammoniakkiPpm: e.ammonia, pm25: e.pm25 }));
      downloadCsv(`${d.stable.replace(/\s+/g, "-")}-ilmanlaatu.csv`, rows);
    } else {
      const rows = getSleipData(d.horse, d.from, d.to).sessions.map((s) => ({ paiva: s.label, symmetriaProsenttia: s.symmetry, askelpituusMetreina: s.stride, kadenssi: s.cadence, aktiivisuus: s.activity }));
      downloadCsv(`${d.horse}-sleip-demo.csv`, rows);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b border-border bg-card/85 backdrop-blur">
        <div className="mx-auto flex max-w-[1500px] flex-wrap items-center justify-between gap-3 px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-xl bg-gradient-primary text-primary-foreground shadow-glow"><Activity className="size-5" /></div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-foreground">Hevosten hyvinvoinnin mittaristo</h1>
              <p className="text-xs text-muted-foreground">KP AlkIoT · pilottiseuranta</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Segmented value={d.range} options={RANGES} onChange={(range) => d.set({ range })} />
            {d.range === "custom" && (
              <div className="flex items-center gap-1.5 text-sm">
                <input type="date" min="2026-09-05" max="2026-10-05" value={d.customFrom} onChange={(e) => d.set({ customFrom: e.target.value })} className="rounded-md border border-input bg-card px-2 py-1.5 text-foreground" />
                <span className="text-muted-foreground">–</span>
                <input type="date" min="2026-09-05" max="2026-10-05" value={d.customTo} onChange={(e) => d.set({ customTo: e.target.value })} className="rounded-md border border-input bg-card px-2 py-1.5 text-foreground" />
              </div>
            )}
            <div className="no-print flex gap-2">
              <button onClick={exportCsv} className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition hover:bg-muted"><Download className="size-4" />CSV</button>
              <button onClick={() => window.print()} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow-glow transition hover:opacity-90"><FileDown className="size-4" />Vie PDF</button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1500px] space-y-5 px-6 py-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <Segmented value={d.view} options={[{ key: "horse", label: "Hevonen" }, { key: "stable", label: "Talli ja ilmanlaatu" }, { key: "sleip", label: "SLEIP-demo" }]} onChange={(view) => d.set({ view })} />
            {d.view !== "stable" ? (
              <div className="flex flex-wrap gap-1.5">
                {FEATURED_HORSES.map((h) => (
                  <button key={h} onClick={() => d.set({ horse: h })}
                    className={cn("rounded-full border px-3.5 py-1.5 text-sm font-medium transition",
                      d.horse === h ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground hover:border-primary/50")}>
                    {h}
                  </button>
                ))}
              </div>
            ) : (
              <select value={d.stable} onChange={(e) => d.set({ stable: e.target.value as StableName })} className="rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground">
                {STABLES.map((s) => <option key={s}>{s}</option>)}
              </select>
            )}
          </div>
          <span className="text-sm text-muted-foreground">{fmtDay(d.from)} – {fmtDay(d.to)} 2026</span>
        </div>

        {d.view === "horse" ? <HorseView /> : d.view === "stable" ? <StableView /> : <SleipView />}
      </main>
    </div>
  );
}
