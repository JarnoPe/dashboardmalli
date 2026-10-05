import { DAY, HOUR, type DrinkingEvent, type EnvReading, type HorseProfile } from "./mock-data";

export type WelfareStatus = "Green" | "Yellow" | "Red";
export type AirQualityStatus = "Hyvä" | "Huomio" | "Heikko";

export function airQualityStatus(co2: number, ammonia: number, pm25: number): AirQualityStatus {
  if (co2 > 1500 || ammonia > 15 || pm25 > 35) return "Heikko";
  if (co2 > 1000 || ammonia > 10 || pm25 > 20) return "Huomio";
  return "Hyvä";
}

/**
 * Welfare rule: compares average daily intake to the horse's own baseline and
 * checks the longest gap between drinking events.
 * Red: intake < 70% of baseline or gap > 12 h. Yellow: intake < 85% or gap > 9 h.
 */
export function welfareStatus(dailyAvg: number, baseline: number, longestGapHours: number): WelfareStatus {
  const ratio = dailyAvg / baseline;
  if (ratio < 0.7 || longestGapHours > 12) return "Red";
  if (ratio < 0.85 || longestGapHours > 9) return "Yellow";
  return "Green";
}

export function longestGapHours(events: DrinkingEvent[]) {
  let max = 0;
  for (let i = 1; i < events.length; i++) max = Math.max(max, events[i]!.t - events[i - 1]!.t);
  return max / HOUR;
}

const pad = (n: number) => String(n).padStart(2, "0");
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const fmtDay = (t: number) => {
  const d = new Date(t);
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
};
export const fmtTime = (t: number) => {
  const d = new Date(t);
  return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
};
export const fmtDateTime = (t: number) => `${fmtDay(t)}, ${fmtTime(t)}`;
export const dayKey = (t: number) => Math.floor(t / DAY) * DAY;

export function dailyBuckets(events: DrinkingEvent[], from: number, to: number) {
  const map = new Map<number, { t: number; litres: number; events: number }>();
  for (let d = dayKey(from); d <= to; d += DAY) map.set(d, { t: d, litres: 0, events: 0 });
  for (const e of events) {
    const b = map.get(dayKey(e.t));
    if (b) {
      b.litres += e.volumeLitres;
      b.events += 1;
    }
  }
  return [...map.values()].map((b) => ({ ...b, label: fmtDay(b.t), litres: round1(b.litres) }));
}

export function movingAverage<T extends { litres: number }>(rows: T[], window = 7) {
  return rows.map((r, i) => {
    const slice = rows.slice(Math.max(0, i - window + 1), i + 1);
    return { ...r, avg: round1(slice.reduce((a, b) => a + b.litres, 0) / slice.length) };
  });
}

export function histogram(events: DrinkingEvent[], step = 0.5, max = 6) {
  const bins = Array.from({ length: Math.ceil(max / step) }, (_, i) => ({
    label: `${(i * step).toFixed(1)}–${((i + 1) * step).toFixed(1)}`,
    count: 0,
  }));
  for (const e of events) bins[Math.min(bins.length - 1, Math.floor(e.volumeLitres / step))]!.count++;
  return bins;
}

/** 7 weekday rows x 24 hour columns, litres per cell. */
export function weekdayHourGrid(events: DrinkingEvent[]) {
  const grid = Array.from({ length: 7 }, () => Array(24).fill(0) as number[]);
  for (const e of events) {
    const d = new Date(e.t);
    grid[(d.getUTCDay() + 6) % 7]![d.getUTCHours()]! += e.volumeLitres;
  }
  return grid;
}

export function hourTotals(events: DrinkingEvent[]) {
  const arr = Array(24).fill(0) as number[];
  for (const e of events) arr[new Date(e.t).getUTCHours()]! += e.volumeLitres;
  return arr;
}

export function summarize(events: DrinkingEvent[], from: number, to: number, profile: HorseProfile) {
  const litres = events.reduce((a, e) => a + e.volumeLitres, 0);
  const days = Math.max(1, (to - from) / DAY);
  const gap = longestGapHours(events);
  const dailyAvg = litres / days;
  return {
    litres: round1(litres),
    events: events.length,
    avgEvent: events.length ? round1(litres / events.length) : 0,
    longestGap: round1(gap),
    dailyAvg: round1(dailyAvg),
    status: welfareStatus(dailyAvg, profile.baseline, gap),
  };
}

export function insights(all: DrinkingEvent[], rangeEvents: DrinkingEvent[], to: number, profile: HorseProfile) {
  const out: { tone: "good" | "warn" | "info"; text: string }[] = [];
  const sum = (a: DrinkingEvent[]) => a.reduce((s, e) => s + e.volumeLitres, 0);
  const thisWeek = sum(all.filter((e) => e.t > to - 7 * DAY && e.t <= to));
  const prevWeek = sum(all.filter((e) => e.t > to - 14 * DAY && e.t <= to - 7 * DAY));
  if (prevWeek > 0) {
    const pct = Math.round(((thisWeek - prevWeek) / prevWeek) * 100);
    if (Math.abs(pct) < 5) out.push({ tone: "good", text: `Water consumption stable compared to previous week (${pct >= 0 ? "+" : ""}${pct}%).` });
    else out.push({ tone: pct < -10 ? "warn" : "info", text: `Water consumption ${pct < 0 ? "decreased" : "increased"} ${Math.abs(pct)}% compared to previous week.` });
  }
  const hours = hourTotals(rangeEvents);
  const total = hours.reduce((a, b) => a + b, 0) || 1;
  const morning = hours.slice(5, 11).reduce((a, b) => a + b, 0) / total;
  const evening = hours.slice(15, 20).reduce((a, b) => a + b, 0) / total;
  if (morning >= evening) out.push({ tone: "info", text: `Drinking activity concentrated during morning hours (${Math.round(morning * 100)}% between 05–11).` });
  else out.push({ tone: "info", text: `Drinking activity concentrated during late afternoon (${Math.round(evening * 100)}% between 15–20).` });
  const gap = longestGapHours(rangeEvents);
  if (gap > 9) out.push({ tone: "warn", text: `Longest interval without drinking was ${round1(gap)} h — review water access overnight.` });
  const days = new Set(rangeEvents.map((e) => dayKey(e.t))).size || 1;
  const ratio = sum(rangeEvents) / days / profile.baseline;
  if (ratio < 0.85) out.push({ tone: "warn", text: `Daily intake is ${Math.round(ratio * 100)}% of ${profile.name}'s baseline (${profile.baseline} L/day).` });
  if (!out.some((o) => o.tone === "warn")) out.push({ tone: "good", text: "No welfare anomalies detected." });
  return out;
}

export function pearson(xs: number[], ys: number[]) {
  const n = xs.length;
  if (n < 3) return 0;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < n; i++) {
    const x = xs[i]!, y = ys[i]!;
    num += (x - mx) * (y - my);
    dx += (x - mx) ** 2;
    dy += (y - my) ** 2;
  }
  return dx && dy ? num / Math.sqrt(dx * dy) : 0;
}

export function envDaily(env: EnvReading[], from: number, to: number) {
  const map = new Map<number, { t: number; temp: number[]; hum: number[]; co2: number[]; ammonia: number[]; pm25: number[] }>();
  for (const r of env) {
    if (r.t < from || r.t > to) continue;
    const k = dayKey(r.t);
    const b = map.get(k) ?? { t: k, temp: [], hum: [], co2: [], ammonia: [], pm25: [] };
    b.temp.push(r.temperature);
    b.hum.push(r.humidity);
    b.co2.push(r.co2);
    b.ammonia.push(r.ammonia);
    b.pm25.push(r.pm25);
    map.set(k, b);
  }
  const avg = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;
  return [...map.values()].map((b) => ({
    t: b.t,
    label: fmtDay(b.t),
    temperature: round1(avg(b.temp)),
    humidity: Math.round(avg(b.hum)),
    co2: Math.round(avg(b.co2)),
    ammonia: round1(avg(b.ammonia)),
    pm25: round1(avg(b.pm25)),
  }));
}

export const round1 = (n: number) => Math.round(n * 10) / 10;
