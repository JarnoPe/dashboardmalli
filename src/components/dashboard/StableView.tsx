import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { Droplets, Droplet, Radio, Users, Thermometer, CloudRain } from "lucide-react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Scatter, ScatterChart,
  Tooltip, XAxis, YAxis, ZAxis,
} from "recharts";
import { api } from "@/lib/api";
import { useDashboard } from "@/lib/dashboard-store";
import { useChartColors, LoadingGrid, Panel, StatCard, axisProps, heatColor, tooltipProps } from "./shared";

export function StableView() {
  const { stable, from, to } = useDashboard();
  const C = useChartColors();
  const { data } = useQuery({
    queryKey: ["stable", stable, from, to],
    queryFn: () => api.fetchStable(stable, from, to),
    placeholderData: keepPreviousData,
  });
  if (!data) return <LoadingGrid />;
  const s = data.summary;
  const heatMax = Math.max(...data.heat.flatMap((h) => h.hours), 0.1);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Number of horses" value={s.horses} hint={stable} icon={<Users className="size-4" />} />
        <StatCard label="Total water consumption" value={s.total.toLocaleString("en-US")} unit="L" hint="Selected period" icon={<Droplets className="size-4" />} />
        <StatCard label="Avg per horse" value={s.perHorse} unit="L" hint={`${s.perHorseDay} L per horse per day`} icon={<Droplet className="size-4" />} />
        <StatCard label="Active sensors" value={`${s.sensorsActive}/${s.sensorsTotal}`} hint={s.sensorsActive < s.sensorsTotal ? "1 sensor offline" : "All sensors online"} icon={<Radio className="size-4" />} tone={s.sensorsActive < s.sensorsTotal ? "warn" : "good"} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Total Consumption per Horse" subtitle="Ranking for selected period">
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={data.ranking} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
                <CartesianGrid stroke={C.grid} horizontal={false} />
                <XAxis type="number" {...axisProps} unit=" L" />
                <YAxis type="category" dataKey="name" {...axisProps} width={60} />
                <Tooltip {...tooltipProps} formatter={(v: number) => [`${v} L`, "Consumed"]} />
                <Bar dataKey="litres" fill={C.bar} radius={[0, 6, 6, 0]} barSize={22} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Daily Stable Consumption" subtitle="All horses combined">
          <div className="h-64">
            <ResponsiveContainer>
              <AreaChart data={data.daily} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={C.bar} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={C.bar} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={C.grid} vertical={false} />
                <XAxis dataKey="label" {...axisProps} minTickGap={20} />
                <YAxis {...axisProps} unit=" L" />
                <Tooltip {...tooltipProps} formatter={(v: number) => [`${v} L`, "Stable total"]} />
                <Area dataKey="litres" stroke={C.bar} strokeWidth={2.5} fill="url(#areaFill)" type="monotone" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Horse Comparison" subtitle="Daily averages vs. individual baseline">
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={data.comparison} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                <CartesianGrid stroke={C.grid} vertical={false} />
                <XAxis dataKey="name" {...axisProps} />
                <YAxis {...axisProps} />
                <Tooltip {...tooltipProps} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="litresPerDay" name="Litres / day" fill={C.bar} radius={[4, 4, 0, 0]} />
                <Bar dataKey="baseline" name="Baseline L / day" fill={C.area} radius={[4, 4, 0, 0]} />
                <Bar dataKey="eventsPerDay" name="Events / day" fill={C.line} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Drinking Activity Heatmap" subtitle="Litres by horse and hour of day">
          <div className="overflow-x-auto">
            <div className="min-w-[520px]">
              {data.heat.map((row) => (
                <div key={row.name} className="mb-1.5 flex items-center gap-1">
                  <span className="w-14 text-xs text-muted-foreground">{row.name}</span>
                  {row.hours.map((v, h) => (
                    <div key={h} title={`${row.name} ${h}:00 — ${v.toFixed(1)} L`} className="h-8 flex-1 rounded-[3px] transition-transform hover:scale-110" style={{ background: heatColor(v / heatMax) }} />
                  ))}
                </div>
              ))}
              <div className="flex gap-1 pl-[3.75rem]">
                {Array.from({ length: 24 }).map((_, h) => (
                  <span key={h} className="flex-1 text-center text-[10px] text-muted-foreground">{h % 3 === 0 ? h : ""}</span>
                ))}
              </div>
            </div>
          </div>
        </Panel>
      </div>

      <div className="flex items-end justify-between pt-2">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Stable environment</h2>
          <p className="text-sm text-muted-foreground">Air temperature and humidity sensors</p>
        </div>
        {data.latestEnv && (
          <div className="flex gap-4 text-sm">
            <span className="flex items-center gap-1.5 text-foreground"><Thermometer className="size-4 text-chart-warm" />{data.latestEnv.temperature} °C</span>
            <span className="flex items-center gap-1.5 text-foreground"><CloudRain className="size-4 text-chart-teal" />{data.latestEnv.humidity} %</span>
          </div>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Temperature trend" subtitle="°C">
          <div className="h-56">
            <ResponsiveContainer>
              <LineChart data={data.envSeries} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid stroke={C.grid} vertical={false} />
                <XAxis dataKey="label" {...axisProps} minTickGap={24} />
                <YAxis {...axisProps} domain={["auto", "auto"]} />
                <Tooltip {...tooltipProps} formatter={(v: number) => [`${v} °C`, "Temperature"]} />
                <Line dataKey="temperature" stroke={C.warm} strokeWidth={2.5} dot={false} type="monotone" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel title="Humidity trend" subtitle="% relative humidity">
          <div className="h-56">
            <ResponsiveContainer>
              <LineChart data={data.envSeries} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid stroke={C.grid} vertical={false} />
                <XAxis dataKey="label" {...axisProps} minTickGap={24} />
                <YAxis {...axisProps} domain={["auto", "auto"]} />
                <Tooltip {...tooltipProps} formatter={(v: number) => [`${v} %`, "Humidity"]} />
                <Line dataKey="humidity" stroke={C.teal} strokeWidth={2.5} dot={false} type="monotone" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel title="Drinking vs. temperature" subtitle={`Correlation r = ${data.corrTemp} (temp) · ${data.corrHum} (humidity)`}>
          <div className="h-56">
            <ResponsiveContainer>
              <ScatterChart margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                <CartesianGrid stroke={C.grid} />
                <XAxis type="number" dataKey="temperature" name="Temperature" unit="°C" {...axisProps} domain={["auto", "auto"]} />
                <YAxis type="number" dataKey="litres" name="Water" unit=" L" {...axisProps} />
                <ZAxis type="number" dataKey="humidity" name="Humidity" range={[30, 120]} unit="%" />
                <Tooltip {...tooltipProps} cursor={{ strokeDasharray: "3 3" }} />
                <Scatter data={data.corr} fill={C.bar} fillOpacity={0.7} />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>
    </div>
  );
}
