// Deterministic local test data for the KP AlkIoT horse welfare proof-of-concept.
export const HOUR = 3_600_000;
export const DAY = 24 * HOUR;
/** "Now" for the demo dataset (fixed so server and browser render identically). */
export const ANCHOR = Date.UTC(2026, 9, 5, 12, 0);
export const DATA_START = Date.UTC(2026, 8, 5, 0, 0);

export const STABLES = ["Kpedu Stable", "Stable A", "Stable B"] as const;
export type StableName = (typeof STABLES)[number];
export const FEATURED_HORSES = ["Antero", "Stella", "Sorppa", "Aami"] as const;

export interface HorseProfile {
  name: string;
  breed: string;
  age: number;
  stable: StableName;
  temperature: number;
  activityScore: number;
  /** Typical daily intake in litres. */
  baseline: number;
  sensorId: string;
  sensorActive: boolean;
}

export interface DrinkingEvent {
  horse: string;
  timestamp: string;
  t: number;
  volumeLitres: number;
  durationSeconds: number;
}

export interface EnvReading {
  stable: StableName;
  t: number;
  temperature: number;
  humidity: number;
}

export const HORSES: HorseProfile[] = [
  { name: "Antero", breed: "Finnhorse", age: 12, stable: "Kpedu Stable", temperature: 37.6, activityScore: 82, baseline: 32, sensorId: "ALK-101", sensorActive: true },
  { name: "Stella", breed: "Finnish Warmblood", age: 9, stable: "Kpedu Stable", temperature: 37.9, activityScore: 71, baseline: 30, sensorId: "ALK-102", sensorActive: true },
  { name: "Sorppa", breed: "Finnhorse", age: 16, stable: "Kpedu Stable", temperature: 37.5, activityScore: 64, baseline: 29, sensorId: "ALK-103", sensorActive: true },
  { name: "Aami", breed: "Shetland Pony", age: 7, stable: "Kpedu Stable", temperature: 37.7, activityScore: 88, baseline: 14, sensorId: "ALK-104", sensorActive: true },
  { name: "Kerttu", breed: "Finnhorse", age: 11, stable: "Stable A", temperature: 37.4, activityScore: 77, baseline: 31, sensorId: "ALK-201", sensorActive: true },
  { name: "Viima", breed: "Haflinger", age: 8, stable: "Stable A", temperature: 37.6, activityScore: 80, baseline: 27, sensorId: "ALK-202", sensorActive: true },
  { name: "Ruusa", breed: "Finnish Warmblood", age: 14, stable: "Stable A", temperature: 37.8, activityScore: 69, baseline: 33, sensorId: "ALK-203", sensorActive: true },
  { name: "Usva", breed: "Icelandic Horse", age: 10, stable: "Stable B", temperature: 37.5, activityScore: 85, baseline: 24, sensorId: "ALK-301", sensorActive: true },
  { name: "Salama", breed: "Standardbred", age: 6, stable: "Stable B", temperature: 37.6, activityScore: 91, baseline: 36, sensorId: "ALK-302", sensorActive: false },
  { name: "Tähti", breed: "Finnhorse", age: 13, stable: "Stable B", temperature: 37.7, activityScore: 73, baseline: 30, sensorId: "ALK-303", sensorActive: true },
];

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Relative drinking likelihood per hour of day: morning and late-afternoon peaks.
const HOUR_WEIGHTS = [0.3, 0.2, 0.15, 0.15, 0.3, 0.8, 1.6, 2.2, 2.0, 1.4, 1.0, 1.1, 1.3, 1.0, 0.9, 1.1, 1.6, 1.9, 1.5, 1.0, 0.8, 0.6, 0.5, 0.4];
const W_SUM = HOUR_WEIGHTS.reduce((a, b) => a + b, 0);

function pickHour(r: number) {
  let x = r * W_SUM;
  for (let h = 0; h < 24; h++) {
    x -= HOUR_WEIGHTS[h]!;
    if (x <= 0) return h;
  }
  return 23;
}

const pad = (n: number) => String(n).padStart(2, "0");
export function isoLocal(t: number) {
  const d = new Date(t);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:00`;
}

function generateEvents(): DrinkingEvent[] {
  const out: DrinkingEvent[] = [];
  HORSES.forEach((h, hi) => {
    const rand = mulberry32(1000 + hi * 97);
    for (let d = 0; d <= 30; d++) {
      const dayStart = DATA_START + d * DAY;
      let target = h.baseline * (0.88 + rand() * 0.24);
      if (h.name === "Stella" && d >= 23) target *= 0.8; // reduced intake last week
      if (h.name === "Antero" && d >= 24) target *= 1.05;
      const n = Math.max(5, Math.round(target / 2.4 + (rand() - 0.5) * 3));
      for (let i = 0; i < n; i++) {
        const hour = pickHour(rand());
        const t = dayStart + hour * HOUR + Math.floor(rand() * 60) * 60_000;
        if (t > ANCHOR) continue;
        const vol = Math.min(6, Math.max(0.4, (target / n) * (0.45 + rand() * 1.1)));
        out.push({
          horse: h.name,
          t,
          timestamp: isoLocal(t),
          volumeLitres: Math.round(vol * 10) / 10,
          durationSeconds: Math.round(vol * 19 + rand() * 12),
        });
      }
    }
  });
  return out.sort((a, b) => a.t - b.t);
}

function generateEnv(): EnvReading[] {
  const out: EnvReading[] = [];
  const base: Record<StableName, number> = { "Kpedu Stable": 12, "Stable A": 10.5, "Stable B": 13.5 };
  STABLES.forEach((s, si) => {
    const rand = mulberry32(50 + si);
    let drift = 0;
    for (let t = DATA_START; t <= ANCHOR; t += HOUR) {
      const hour = new Date(t).getUTCHours();
      const day = (t - DATA_START) / DAY;
      drift += (rand() - 0.5) * 0.25;
      drift *= 0.98;
      const seasonal = -day * 0.08; // cooling into October
      const temp = base[s] + seasonal + drift + 3.2 * Math.sin(((hour - 9) / 24) * 2 * Math.PI) + (rand() - 0.5) * 0.6;
      const hum = Math.min(95, Math.max(40, 72 - (temp - base[s]) * 2.6 + (rand() - 0.5) * 4));
      out.push({ stable: s, t, temperature: Math.round(temp * 10) / 10, humidity: Math.round(hum) });
    }
  });
  return out;
}

export const EVENTS = generateEvents();
export const ENV = generateEnv();
