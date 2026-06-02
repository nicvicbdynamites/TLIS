export type GenerationType = "hooks" | "captions" | "prompts" | "ideas";
export type TierType = "free" | "pro" | "elite";

export interface HistoryEntry {
  id: string;
  type: GenerationType;
  niche: string;
  tone: string;
  timestamp: string;
  cost: number;
}

export interface UsageLimits {
  dailyGenerations: number;
  monthlyCostUsd: number;
}

export interface UsageData {
  session: {
    startedAt: string;
    generations: number;
    cost: number;
  };
  daily: {
    date: string;
    generations: number;
    cost: number;
  };
  allTime: {
    generations: number;
    cost: number;
  };
  history: HistoryEntry[];
  limits: UsageLimits;
  tier: TierType;
}

const STORAGE_KEY = "tlis_usage_v1";
export const COST_PER_GENERATION = 0.0004;

const TIER_LIMITS: Record<TierType, UsageLimits> = {
  free: { dailyGenerations: 10, monthlyCostUsd: 0.5 },
  pro: { dailyGenerations: 100, monthlyCostUsd: 5 },
  elite: { dailyGenerations: 1000, monthlyCostUsd: 50 },
};

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function defaultData(): UsageData {
  return {
    session: {
      startedAt: new Date().toISOString(),
      generations: 0,
      cost: 0,
    },
    daily: {
      date: todayStr(),
      generations: 0,
      cost: 0,
    },
    allTime: {
      generations: 0,
      cost: 0,
    },
    history: [],
    limits: TIER_LIMITS.free,
    tier: "free",
  };
}

export function loadUsage(): UsageData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultData();
    const parsed: UsageData = JSON.parse(raw);

    if (parsed.daily.date !== todayStr()) {
      parsed.daily = { date: todayStr(), generations: 0, cost: 0 };
    }

    return parsed;
  } catch {
    return defaultData();
  }
}

export function saveUsage(data: UsageData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // storage unavailable — fail silently
  }
}

export function trackGeneration(
  type: GenerationType,
  niche: string,
  tone: string
): UsageData {
  const data = loadUsage();
  const cost = COST_PER_GENERATION;
  const entry: HistoryEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type,
    niche,
    tone,
    timestamp: new Date().toISOString(),
    cost,
  };

  data.session.generations += 1;
  data.session.cost += cost;
  data.daily.generations += 1;
  data.daily.cost += cost;
  data.allTime.generations += 1;
  data.allTime.cost += cost;
  data.history = [entry, ...data.history].slice(0, 100);

  saveUsage(data);
  return data;
}

export function resetSession(data: UsageData): UsageData {
  const updated: UsageData = {
    ...data,
    session: {
      startedAt: new Date().toISOString(),
      generations: 0,
      cost: 0,
    },
  };
  saveUsage(updated);
  return updated;
}

export function resetDaily(data: UsageData): UsageData {
  const updated: UsageData = {
    ...data,
    daily: { date: todayStr(), generations: 0, cost: 0 },
  };
  saveUsage(updated);
  return updated;
}

export function resetAllTime(data: UsageData): UsageData {
  const updated: UsageData = {
    ...data,
    allTime: { generations: 0, cost: 0 },
    history: [],
  };
  saveUsage(updated);
  return updated;
}

export function setTier(data: UsageData, tier: TierType): UsageData {
  const updated: UsageData = {
    ...data,
    tier,
    limits: TIER_LIMITS[tier],
  };
  saveUsage(updated);
  return updated;
}

export function setLimits(data: UsageData, limits: UsageLimits): UsageData {
  const updated: UsageData = { ...data, limits };
  saveUsage(updated);
  return updated;
}

export function isOverDailyLimit(data: UsageData): boolean {
  return data.daily.generations >= data.limits.dailyGenerations;
}

export function isNearDailyLimit(data: UsageData): boolean {
  return data.daily.generations >= data.limits.dailyGenerations * 0.8;
}

export function isOverCostLimit(data: UsageData): boolean {
  const monthlySpend = data.allTime.cost;
  return monthlySpend >= data.limits.monthlyCostUsd;
}

export function formatCost(usd: number): string {
  if (usd < 0.01) return `$${(usd * 100).toFixed(3)}¢`;
  return `$${usd.toFixed(4)}`;
}

export function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) +
    " · " +
    d.toLocaleDateString([], { month: "short", day: "numeric" });
}

export const TYPE_LABELS: Record<GenerationType, string> = {
  hooks: "Hooks",
  captions: "Captions",
  prompts: "Prompts",
  ideas: "Viral Ideas",
};

export const TIER_LABELS: Record<TierType, { label: string; color: string }> = {
  free: { label: "Free", color: "text-muted-foreground" },
  pro: { label: "Pro", color: "text-chart-2" },
  elite: { label: "Elite", color: "text-primary" },
};
