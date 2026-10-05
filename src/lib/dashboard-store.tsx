import type React from "react";
import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { resolveRange, type RangeKey } from "./api";
import type { StableName } from "./mock-data";

interface State {
  view: "horse" | "stable";
  range: RangeKey;
  customFrom: string;
  customTo: string;
  horse: string;
  stable: StableName;
}

interface Ctx extends State {
  set: (patch: Partial<State>) => void;
  from: number;
  to: number;
}

// Keep a single context instance across hot reloads so provider and consumers always match.
const g = globalThis as unknown as { __dashboardCtx?: React.Context<Ctx | null> };
const DashboardContext = (g.__dashboardCtx ??= createContext<Ctx | null>(null));

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>({
    view: "horse",
    range: "7d",
    customFrom: "2026-09-20",
    customTo: "2026-10-05",
    horse: "Antero",
    stable: "Kpedu Stable",
  });
  const value = useMemo(() => {
    const { from, to } = resolveRange({ key: state.range, customFrom: state.customFrom, customTo: state.customTo });
    return { ...state, from, to, set: (p: Partial<State>) => setState((s) => ({ ...s, ...p })) };
  }, [state]);
  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
}

export function useDashboard() {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error("useDashboard must be used inside DashboardProvider");
  return ctx;
}
