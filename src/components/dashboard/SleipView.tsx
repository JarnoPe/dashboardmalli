import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Activity, Footprints, Gauge, MoveHorizontal } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api } from "@/lib/api";
import { useDashboard } from "@/lib/dashboard-store";
import { LoadingGrid, Panel, StatCard, axisProps, tooltipProps, useChartColors } from "./shared";

export function SleipView() {
  const { horse, from, to } = useDashboard();
  const C = useChartColors();
  const { data } = useQuery({ queryKey: ["sleip", horse, from, to], queryFn: () => api.fetchSleip(horse, from, to), placeholderData: keepPreviousData });
  if (!data) return <LoadingGrid />;
  const latest = data.latest;
  return <div className="space-y-4">
    <div><h2 className="text-lg font-semibold text-foreground">SLEIP Data Dashboard -demo</h2><p className="text-sm text-muted-foreground">Liikkeen symmetria, askelpituus, kadenssi ja aktiivisuus</p></div>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard label="Liikkeen symmetria" value={latest.symmetry} unit="%" hint="Viimeisin analyysi" icon={<MoveHorizontal className="size-4" />} tone="good" />
      <StatCard label="Askelpituus" value={latest.stride} unit="m" hint="Ravin keskiarvo" icon={<Footprints className="size-4" />} />
      <StatCard label="Kadenssi" value={latest.cadence} unit="askelta/min" hint="Tasainen rytmi" icon={<Gauge className="size-4" />} />
      <StatCard label="Aktiivisuus" value={latest.activity} unit="/100" hint="Liikesensorin indeksi" icon={<Activity className="size-4" />} />
    </div>
    <Panel title="Liikeanalyysin yhteenveto" subtitle={`${data.profile.name} · SLEIP-demo`}>
      <div className="flex items-start gap-3 rounded-md border border-status-good/30 bg-status-good/5 p-4"><Activity className="mt-0.5 size-5 shrink-0 text-status-good" /><p className="text-sm text-foreground">{data.observation}</p></div>
    </Panel>
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel title="Symmetrian kehitys" subtitle="100 % tarkoittaa täysin symmetristä liikettä"><div className="h-72"><ResponsiveContainer><LineChart data={data.sessions} margin={{ top: 5, right: 8, left: -12, bottom: 0 }}><CartesianGrid stroke={C.grid} vertical={false} /><XAxis dataKey="label" {...axisProps} /><YAxis {...axisProps} domain={[88, 100]} unit=" %" /><Tooltip {...tooltipProps} /><Line dataKey="symmetry" name="Symmetria" stroke={C.teal} strokeWidth={2.5} dot={{ r: 3 }} type="monotone" /></LineChart></ResponsiveContainer></div></Panel>
      <Panel title="Askel ja aktiivisuus" subtitle="Harjoituskertojen vertailu"><div className="h-72"><ResponsiveContainer><LineChart data={data.sessions} margin={{ top: 5, right: 8, left: -12, bottom: 0 }}><CartesianGrid stroke={C.grid} vertical={false} /><XAxis dataKey="label" {...axisProps} /><YAxis yAxisId="stride" {...axisProps} domain={[2.5, 3.1]} /><YAxis yAxisId="activity" orientation="right" {...axisProps} domain={[50, 100]} /><Tooltip {...tooltipProps} /><Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} /><Line yAxisId="stride" dataKey="stride" name="Askelpituus (m)" stroke={C.bar} strokeWidth={2.5} dot={false} /><Line yAxisId="activity" dataKey="activity" name="Aktiivisuus" stroke={C.warm} strokeWidth={2.5} dot={false} /></LineChart></ResponsiveContainer></div></Panel>
      <Panel title="Vasen–oikea-vertailu" subtitle="Isku ja ponnistus, osuus kokonaisliikkeestä" className="lg:col-span-2"><div className="h-64"><ResponsiveContainer><BarChart data={data.leftRight} margin={{ top: 5, right: 8, left: -12, bottom: 0 }}><CartesianGrid stroke={C.grid} vertical={false} /><XAxis dataKey="side" {...axisProps} /><YAxis {...axisProps} domain={[0, 60]} unit=" %" /><Tooltip {...tooltipProps} /><Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} /><Bar dataKey="impact" name="Isku" fill={C.bar} radius={[4, 4, 0, 0]} /><Bar dataKey="pushOff" name="Ponnistus" fill={C.teal} radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div></Panel>
    </div>
    <p className="text-xs text-muted-foreground">SLEIP-luvut ovat simuloitua demodataa, eivät eläinlääketieteellinen diagnoosi.</p>
  </div>;
}