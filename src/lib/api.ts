// Mock API layer: async functions shaped like real backend calls, served from local test data.
import { ANCHOR, DATA_START, DAY, ENV, EVENTS, HORSES, HOUR, type StableName } from "./mock-data";
import {
  airQualityStatus, dailyBuckets, envDaily, fmtDateTime, fmtTime, histogram, hourTotals, insights, movingAverage,
  pearson, round1, summarize, weekdayHourGrid,
} from "./analytics";

export type RangeKey = "24h" | "7d" | "30d" | "custom";
export interface RangeFilter { key: RangeKey; customFrom: string; customTo: string }

export function resolveRange(f: RangeFilter): { from: number; to: number } {
  if (f.key === "24h") return { from: ANCHOR - DAY, to: ANCHOR };
  if (f.key === "7d") return { from: ANCHOR - 7 * DAY, to: ANCHOR };
  if (f.key === "30d") return { from: ANCHOR - 30 * DAY, to: ANCHOR };
  const from = Math.max(DATA_START, Date.parse(f.customFrom + "T00:00:00Z") || DATA_START);
  const to = Math.min(ANCHOR, (Date.parse(f.customTo + "T00:00:00Z") || ANCHOR) + DAY - 1);
  return from < to ? { from, to } : { from: ANCHOR - 7 * DAY, to: ANCHOR };
}

const delay = <T,>(v: T) => new Promise<T>((r) => setTimeout(() => r(v), 180));

export function getHorseData(name: string, from: number, to: number) {
  const profile = HORSES.find((h) => h.name === name)!;
  const all = EVENTS.filter((e) => e.horse === name);
  const events = all.filter((e) => e.t >= from && e.t <= to);
  let cum = 0;
  const timeline = events.map((e) => {
    cum += e.volumeLitres;
    return { t: e.t, label: (to - from) <= DAY ? fmtTime(e.t) : fmtDateTime(e.t), litres: e.volumeLitres, cumulative: round1(cum), duration: e.durationSeconds };
  });
  const daily = movingAverage(dailyBuckets(events, from, to));
  return {
    profile,
    events,
    summary: summarize(events, from, to, profile),
    timeline,
    daily,
    grid: weekdayHourGrid(events),
    hours: hourTotals(events).map((v, h) => ({ hour: h, litres: round1(v) })),
    histogram: histogram(events),
    insights: insights(all, events, to, profile),
  };
}

export function getStableData(stable: StableName, from: number, to: number) {
  const horses = HORSES.filter((h) => h.stable === stable);
  const names = horses.map((h) => h.name);
  const events = EVENTS.filter((e) => names.includes(e.horse) && e.t >= from && e.t <= to);
  const total = events.reduce((a, e) => a + e.volumeLitres, 0);
  const days = Math.max(1, (to - from) / DAY);

  const ranking = horses
    .map((h) => ({ name: h.name, litres: round1(events.filter((e) => e.horse === h.name).reduce((a, e) => a + e.volumeLitres, 0)) }))
    .sort((a, b) => b.litres - a.litres);

  const daily = dailyBuckets(events, from, to);

  const comparison = horses.map((h) => {
    const ev = events.filter((e) => e.horse === h.name);
    const l = ev.reduce((a, e) => a + e.volumeLitres, 0);
    return {
      name: h.name,
      litresPerDay: round1(l / days),
      eventsPerDay: round1(ev.length / days),
      baseline: h.baseline,
    };
  });

  const heat = horses.map((h) => ({ name: h.name, hours: hourTotals(events.filter((e) => e.horse === h.name)) }));

  const envRange = ENV.filter((r) => r.stable === stable && r.t >= from && r.t <= to);
  const shortRange = to - from <= 2 * DAY;
  const envSeries = shortRange
    ? envRange.map((r) => ({ label: fmtTime(r.t), temperature: r.temperature, humidity: r.humidity, co2: r.co2, ammonia: r.ammonia, pm25: r.pm25 }))
    : envDaily(envRange, from, to);

  // Correlation: hourly stable consumption vs temperature (hourly for short ranges, daily otherwise)
  let corr: { temperature: number; humidity: number; litres: number }[];
  if (shortRange) {
    corr = envRange.map((r) => ({
      temperature: r.temperature,
      humidity: r.humidity,
      litres: round1(events.filter((e) => e.t >= r.t && e.t < r.t + HOUR).reduce((a, e) => a + e.volumeLitres, 0)),
    }));
  } else {
    // only full days, so partial first/last days don't skew the correlation
    const ed = envDaily(envRange, from, to).filter((d) => d.t >= from && d.t + DAY - 1 <= to);
    corr = ed.map((d) => ({
      temperature: d.temperature,
      humidity: d.humidity,
      litres: daily.find((x) => x.t === d.t)?.litres ?? 0,
    }));
  }

  const latest = envRange[envRange.length - 1];
  return {
    horses,
    events,
    summary: {
      horses: horses.length,
      total: round1(total),
      perHorse: round1(total / horses.length),
      perHorseDay: round1(total / horses.length / days),
      sensorsActive: horses.filter((h) => h.sensorActive).length + 2,
      sensorsTotal: horses.length + 2,
    },
    ranking,
    daily,
    comparison,
    heat,
    envSeries,
    corr,
    corrTemp: Math.round(pearson(corr.map((c) => c.temperature), corr.map((c) => c.litres)) * 100) / 100,
    corrHum: Math.round(pearson(corr.map((c) => c.humidity), corr.map((c) => c.litres)) * 100) / 100,
    latestEnv: latest,
    airStatus: latest ? airQualityStatus(latest.co2, latest.ammonia, latest.pm25) : "Hyvä",
  };
}

export function getSleipData(name: string, from: number, to: number) {
  const profile = HORSES.find((h) => h.name === name);
  if (!profile) throw new Error("Hevosta ei löytynyt");
  const days = Math.max(1, Math.ceil((to - from) / DAY));
  const seed = [...name].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const sessions = Array.from({ length: Math.min(days, 14) }, (_, index) => {
    const t = to - (Math.min(days, 14) - 1 - index) * DAY;
    const wave = Math.sin((seed + index) * 1.7);
    return {
      t,
      label: fmtDateTime(t).split(",")[0],
      symmetry: round1(94.5 + wave * 1.7),
      stride: round1(2.82 + wave * 0.08),
      cadence: Math.round(82 + wave * 3),
      activity: Math.round(profile.activityScore + wave * 4),
    };
  });
  const latest = sessions[sessions.length - 1];
  return {
    profile,
    sessions,
    latest: latest ?? { symmetry: 0, stride: 0, cadence: 0, activity: 0 },
    leftRight: [
      { side: "Vasen", impact: round1(50.6 + (seed % 5) * 0.2), pushOff: round1(49.8 + (seed % 3) * 0.3) },
      { side: "Oikea", impact: round1(49.4 - (seed % 5) * 0.2), pushOff: round1(50.2 - (seed % 3) * 0.3) },
    ],
    observation: "Liike on tasapainoista, eikä merkittävää puolieroa havaittu valitulla jaksolla.",
  };
}

export const api = {
  fetchHorse: (name: string, from: number, to: number) => delay(getHorseData(name, from, to)),
  fetchStable: (stable: StableName, from: number, to: number) => delay(getStableData(stable, from, to)),
  fetchSleip: (name: string, from: number, to: number) => delay(getSleipData(name, from, to)),
};

export type HorseData = ReturnType<typeof getHorseData>;
export type StableData = ReturnType<typeof getStableData>;
export type SleipData = ReturnType<typeof getSleipData>;
