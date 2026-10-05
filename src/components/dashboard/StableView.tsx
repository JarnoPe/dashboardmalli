import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { CloudFog, CloudRain, Droplets, Gauge, Radio, Thermometer, Wind } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api } from "@/lib/api";
import { useDashboard } from "@/lib/dashboard-store";
import { LoadingGrid, Panel, StatCard, axisProps, tooltipProps, useChartColors } from "./shared";

export function StableView() {
  const { stable, from, to } = useDashboard();
  const C = useChartColors();
  const { data } = useQuery({
    queryKey: ["stable", stable, from, to],
    queryFn: () => api.fetchStable(stable, from, to),
    placeholderData: keepPreviousData,
  });
  if (!data) return <LoadingGrid />;
  const latest = data.latestEnv;
  const statusTone = data.airStatus === "Hyvä" ? "good" : data.airStatus === "Huomio" ? "warn" : "bad";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Tallin ilmanlaatu</h2>
          <p className="text-sm text-muted-foreground">Hiilidioksidi, ammoniakki, pienhiukkaset, lämpötila ja ilmankosteus</p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1.5 text-sm font-medium text-foreground">
          <span className={`size-2.5 rounded-full ${statusTone === "good" ? "bg-status-good" : statusTone === "warn" ? "bg-status-warn" : "bg-status-bad"}`} />
          Ilmanlaatu: {data.airStatus}
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Hiilidioksidi" value={latest?.co2 ?? "–"} unit="ppm" hint="Tavoite alle 1 000 ppm" icon={<Wind className="size-4" />} tone={(latest?.co2 ?? 0) > 1000 ? "warn" : "good"} />
        <StatCard label="Ammoniakki" value={latest?.ammonia ?? "–"} unit="ppm" hint="Tavoite alle 10 ppm" icon={<CloudFog className="size-4" />} tone={(latest?.ammonia ?? 0) > 10 ? "warn" : "good"} />
        <StatCard label="Pienhiukkaset PM2.5" value={latest?.pm25 ?? "–"} unit="µg/m³" hint="Tavoite alle 20 µg/m³" icon={<Gauge className="size-4" />} tone={(latest?.pm25 ?? 0) > 20 ? "warn" : "good"} />
        <StatCard label="Lämpötila" value={latest?.temperature ?? "–"} unit="°C" hint="Tallin viimeisin mittaus" icon={<Thermometer className="size-4" />} />
        <StatCard label="Ilmankosteus" value={latest?.humidity ?? "–"} unit="%" hint="Suhteellinen kosteus" icon={<CloudRain className="size-4" />} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Hiilidioksidin kehitys" subtitle="ppm · ilmanvaihdon toimivuuden seuranta">
          <div className="h-64"><ResponsiveContainer><AreaChart data={data.envSeries} margin={{ top: 5, right: 8, left: -10, bottom: 0 }}>
            <CartesianGrid stroke={C.grid} vertical={false} /><XAxis dataKey="label" {...axisProps} minTickGap={24} /><YAxis {...axisProps} />
            <Tooltip {...tooltipProps} formatter={(value: number) => [`${value} ppm`, "CO₂"]} />
            <Area dataKey="co2" name="CO₂" stroke={C.bar} fill={C.area} fillOpacity={0.45} strokeWidth={2.5} type="monotone" />
          </AreaChart></ResponsiveContainer></div>
        </Panel>
        <Panel title="Ilman epäpuhtaudet" subtitle="Ammoniakki ja pienhiukkaset">
          <div className="h-64"><ResponsiveContainer><LineChart data={data.envSeries} margin={{ top: 5, right: 8, left: -15, bottom: 0 }}>
            <CartesianGrid stroke={C.grid} vertical={false} /><XAxis dataKey="label" {...axisProps} minTickGap={24} /><YAxis {...axisProps} />
            <Tooltip {...tooltipProps} /><Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
            <Line dataKey="ammonia" name="Ammoniakki (ppm)" stroke={C.warm} strokeWidth={2.5} dot={false} type="monotone" />
            <Line dataKey="pm25" name="PM2.5 (µg/m³)" stroke={C.teal} strokeWidth={2.5} dot={false} type="monotone" />
          </LineChart></ResponsiveContainer></div>
        </Panel>
        <Panel title="Lämpötila ja ilmankosteus" subtitle="Tallin olosuhteiden kehitys">
          <div className="h-64"><ResponsiveContainer><LineChart data={data.envSeries} margin={{ top: 5, right: 8, left: -15, bottom: 0 }}>
            <CartesianGrid stroke={C.grid} vertical={false} /><XAxis dataKey="label" {...axisProps} minTickGap={24} /><YAxis yAxisId="temp" {...axisProps} /><YAxis yAxisId="hum" orientation="right" {...axisProps} />
            <Tooltip {...tooltipProps} /><Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
            <Line yAxisId="temp" dataKey="temperature" name="Lämpötila °C" stroke={C.warm} strokeWidth={2.5} dot={false} type="monotone" />
            <Line yAxisId="hum" dataKey="humidity" name="Ilmankosteus %" stroke={C.teal} strokeWidth={2.5} dot={false} type="monotone" />
          </LineChart></ResponsiveContainer></div>
        </Panel>
        <Panel title="Olosuhdemittarit" subtitle="Kaikki tallin aktiiviset anturit">
          <div className="grid h-64 content-center gap-4 sm:grid-cols-2">
            <Meter label="Ilmanvaihto" value={latest ? Math.max(0, Math.min(100, Math.round(110 - latest.co2 / 12))) : 0} unit="%" />
            <Meter label="Ilman puhtaus" value={latest ? Math.max(0, Math.min(100, Math.round(105 - latest.pm25 * 2))) : 0} unit="%" />
            <Meter label="Anturit verkossa" value={Math.round((data.summary.sensorsActive / data.summary.sensorsTotal) * 100)} unit="%" />
            <Meter label="Olosuhdevakaus" value={92} unit="%" />
          </div>
        </Panel>
      </div>

      <div className="flex items-end justify-between pt-3">
        <div><h2 className="text-lg font-semibold text-foreground">Hevoset ja vedenkulutus</h2><p className="text-sm text-muted-foreground">Täydentävät hyvinvointi- ja laitetiedot</p></div>
        <span className="flex items-center gap-1.5 text-sm text-muted-foreground"><Radio className="size-4" />{data.summary.sensorsActive}/{data.summary.sensorsTotal} anturia käytössä</span>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <StatCard label="Hevosia" value={data.summary.horses} hint={stable} icon={<Radio className="size-4" />} />
        <StatCard label="Vettä yhteensä" value={data.summary.total.toLocaleString("fi-FI")} unit="l" hint="Valittu ajanjakso" icon={<Droplets className="size-4" />} />
        <Panel title="Päivittäinen vedenkulutus" subtitle="Kaikki hevoset yhteensä">
          <div className="h-32"><ResponsiveContainer><BarChart data={data.daily}><XAxis dataKey="label" hide /><YAxis hide /><Tooltip {...tooltipProps} formatter={(value: number) => [`${value} l`, "Kulutus"]} /><Bar dataKey="litres" fill={C.bar} radius={[3, 3, 0, 0]} /></BarChart></ResponsiveContainer></div>
        </Panel>
      </div>
      <p className="text-xs text-muted-foreground">Kaikki tiedot ovat simuloitua demodataa.</p>
    </div>
  );
}

function Meter({ label, value, unit }: { label: string; value: number; unit: string }) {
  return <div><div className="mb-1.5 flex justify-between text-sm"><span className="text-muted-foreground">{label}</span><span className="font-semibold text-foreground">{value}{unit}</span></div><div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${value}%` }} /></div></div>;
}