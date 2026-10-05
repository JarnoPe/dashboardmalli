import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { Activity, AlertTriangle, CheckCircle2, Clock, Droplets, Footprints, Gauge, HeartPulse, Info, MoveHorizontal, Thermometer } from "lucide-react";
import {
  Bar, BarChart, CartesianGrid, ComposedChart, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend,
} from "recharts";
import { api } from "@/lib/api";
import { useDashboard } from "@/lib/dashboard-store";
import { cn } from "@/lib/utils";
import { useChartColors, LoadingGrid, Panel, StatCard, axisProps, heatColor, tooltipProps } from "./shared";

const WEEKDAYS = ["ma", "ti", "ke", "to", "pe", "la", "su"];

export function HorseView() {
  const { horse, from, to } = useDashboard();
  const C = useChartColors();
  const { data } = useQuery({
    queryKey: ["horse", horse, from, to],
    queryFn: () => api.fetchHorse(horse, from, to),
    placeholderData: keepPreviousData,
  });
  const { data: sleip } = useQuery({
    queryKey: ["sleip", horse, from, to],
    queryFn: () => api.fetchSleip(horse, from, to),
    placeholderData: keepPreviousData,
  });
  if (!data) return <LoadingGrid />;
  const { summary: s, profile: p } = data;
  const statusTone = s.status === "Green" ? "good" : s.status === "Yellow" ? "warn" : "bad";
  const gridMax = Math.max(...data.grid.flat(), 0.1);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Vettä juotu" value={s.litres} unit="l" hint={`${s.dailyAvg} l/vrk keskimäärin`} icon={<Droplets className="size-4" />} />
        <StatCard label="Juomakertoja" value={s.events} hint="Juomakupin anturin mittaama" icon={<Activity className="size-4" />} />
        <StatCard label="Keskimääräinen juomamäärä" value={s.avgEvent} unit="l" hint="Litraa juomakertaa kohti" icon={<Gauge className="size-4" />} />
        <StatCard label="Pisin juomaton aika" value={s.longestGap} unit="h" hint="Peräkkäisten juomakertojen väli" icon={<Clock className="size-4" />} tone={s.longestGap > 9 ? "warn" : "default"} />
        <StatCard
          label="Hyvinvoinnin tila"
          value={<span className="flex items-center gap-2"><span className={cn("size-3 rounded-full", statusTone === "good" ? "bg-status-good" : statusTone === "warn" ? "bg-status-warn" : "bg-status-bad")} />{{ Green: "Hyvä", Yellow: "Huomio", Red: "Hälytys" }[s.status]}</span>}
          hint={`Perustaso ${p.baseline} l/vrk`}
          icon={<HeartPulse className="size-4" />}
          tone={statusTone}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-4">
        <Panel title="Vedenkulutuksen aikajana" subtitle="Juomakertojen määrä ja kumulatiivinen kulutus" className="xl:col-span-3">
          <div className="h-80">
            <ResponsiveContainer>
              <ComposedChart data={data.timeline} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
                <CartesianGrid stroke={C.grid} vertical={false} />
                <XAxis dataKey="label" {...axisProps} minTickGap={40} />
                <YAxis yAxisId="l" {...axisProps} unit=" L" />
                <YAxis yAxisId="c" orientation="right" {...axisProps} unit=" L" />
                <Tooltip {...tooltipProps} formatter={(v: number, n) => [`${v} L`, n]} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                <Bar yAxisId="l" dataKey="litres" name="Juomamäärä" fill={C.bar} radius={[3, 3, 0, 0]} maxBarSize={14} />
                <Line yAxisId="c" dataKey="cumulative" name="Kertymä" stroke={C.line} strokeWidth={2.5} dot={false} type="monotone" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Hevosen tiedot" subtitle={`Anturi ${p.sensorId}`}>
          <div className="mb-4 flex items-center gap-3">
            <div className="grid size-12 place-items-center rounded-full bg-primary text-lg font-bold text-primary-foreground">{p.name[0]}</div>
            <div>
              <div className="font-semibold text-foreground">{p.name}</div>
              <div className="text-xs text-muted-foreground">{p.breed}</div>
            </div>
          </div>
          <dl className="space-y-2.5 text-sm">
            {[
              ["Ikä", `${p.age} vuotta`],
              ["Talli", p.stable],
              ["Viimeisin lämpötila", `${p.temperature} °C`],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between border-b border-border pb-2">
                <dt className="text-muted-foreground">{k}</dt>
                <dd className="font-medium text-foreground">{v}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-4">
            <div className="mb-1.5 flex justify-between text-sm">
              <span className="text-muted-foreground">Aktiivisuusindeksi</span>
              <span className="font-semibold text-foreground">{p.activityScore}/100</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-gradient-primary transition-all duration-700" style={{ width: `${p.activityScore}%` }} />
            </div>
          </div>
        </Panel>
      </div>

      <Panel title="Hyvinvointihavainnot" subtitle="Automaattisesti muodostetut havainnot">
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {data.insights.map((i) => (
            <li key={i.text} className={cn("flex gap-2.5 rounded-lg border p-3 text-sm",
              i.tone === "good" && "border-status-good/30 bg-status-good/5",
              i.tone === "warn" && "border-status-warn/40 bg-status-warn/5",
              i.tone === "info" && "border-primary/20 bg-primary/5")}>
              {i.tone === "good" ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-status-good" /> : i.tone === "warn" ? <AlertTriangle className="mt-0.5 size-4 shrink-0 text-status-warn" /> : <Info className="mt-0.5 size-4 shrink-0 text-primary" />}
              <span className="text-foreground">{i.text}</span>
            </li>
          ))}
        </ul>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Juomakerrat päivittäin">
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={data.daily} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid stroke={C.grid} vertical={false} />
                <XAxis dataKey="label" {...axisProps} minTickGap={20} />
                <YAxis {...axisProps} allowDecimals={false} />
                <Tooltip {...tooltipProps} />
                <Bar dataKey="events" name="Juomakerrat" fill={C.bar} radius={[4, 4, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Vedenkulutuksen kehitys" subtitle="Päivittäiset litrat ja seitsemän päivän liukuva keskiarvo">
          <div className="h-64">
            <ResponsiveContainer>
              <LineChart data={data.daily} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                <CartesianGrid stroke={C.grid} vertical={false} />
                <XAxis dataKey="label" {...axisProps} minTickGap={20} />
                <YAxis {...axisProps} unit=" L" />
                <Tooltip {...tooltipProps} formatter={(v: number, n) => [`${v} L`, n]} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                <Line dataKey="litres" name="Päivittäin" stroke={C.bar} strokeOpacity={0.45} strokeWidth={1.5} dot={{ r: 2 }} />
                <Line dataKey="avg" name="7 päivän keskiarvo" stroke={C.line} strokeWidth={2.5} dot={false} type="monotone" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Juomisen tuntijakauma" subtitle="Litrat viikonpäivän ja tunnin mukaan (0–23)">
          <div className="overflow-x-auto">
            <div className="min-w-[520px]">
              {data.grid.map((row, d) => (
                <div key={d} className="mb-1 flex items-center gap-1">
                  <span className="w-9 text-xs text-muted-foreground">{WEEKDAYS[d]}</span>
                  {row.map((v, h) => (
                    <div key={h} title={`${WEEKDAYS[d]} ${h}:00 — ${v.toFixed(1)} L`} className="h-6 flex-1 rounded-[3px] transition-transform hover:scale-125" style={{ background: heatColor(v / gridMax) }} />
                  ))}
                </div>
              ))}
              <div className="flex gap-1 pl-10">
                {Array.from({ length: 24 }).map((_, h) => (
                  <span key={h} className="flex-1 text-center text-[10px] text-muted-foreground">{h % 3 === 0 ? h : ""}</span>
                ))}
              </div>
            </div>
          </div>
        </Panel>

        <Panel title="Juomakertojen jakauma" subtitle="Juomakertojen määrä tilavuuden mukaan (l)">
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={data.histogram} barCategoryGap={2} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid stroke={C.grid} vertical={false} />
                <XAxis dataKey="label" {...axisProps} interval={1} />
                <YAxis {...axisProps} allowDecimals={false} />
                <Tooltip {...tooltipProps} labelFormatter={(l) => `${l} L`} />
                <Bar dataKey="count" name="Juomakerrat" fill={C.area} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Thermometer className="size-3.5" />Ruumiinlämpö on viimeisimmästä manuaalisesta tarkastuksesta. Kaikki tiedot ovat simuloitua demodataa.</p>
    </div>
  );
}
