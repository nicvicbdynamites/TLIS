export type PostStatus = "draft" | "scheduled" | "posted" | "viral";
export type PostType = "hook" | "caption" | "prompt" | "idea" | "custom";
export type CalendarPlatform = "TikTok" | "Instagram Reels" | "YouTube Shorts" | "Pinterest";

export interface CalendarPost {
  id: string;
  title: string;
  content: string;
  type: PostType;
  platform: CalendarPlatform;
  niche: string;
  status: PostStatus;
  scheduledDay: string; // YYYY-MM-DD
  scheduledTime: string | null; // "HH:MM"
  createdAt: string;
  note?: string;
}

const STORAGE_KEY = "tlis_calendar_v1";

const NICHES = [
  "Quiet Luxury Lifestyle", "Dark Feminine Aesthetic", "Old Money Fashion",
  "Silent Wealth Signals", "Minimalist Wealth Flex", "Luxury Morning Routine",
];
const PLATFORMS: CalendarPlatform[] = ["TikTok", "Instagram Reels", "YouTube Shorts", "Pinterest"];
const STATUSES: PostStatus[] = ["draft", "scheduled", "posted", "viral"];

function dayStr(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

function seed(): CalendarPost[] {
  return [
    {
      id: "seed-1",
      title: "Quiet Luxury Morning Hook",
      content: "POV: You found the one brand that old money families have been quietly wearing for three generations — and nobody told you.",
      type: "hook",
      platform: "TikTok",
      niche: "Quiet Luxury Lifestyle",
      status: "viral",
      scheduledDay: dayStr(-2),
      scheduledTime: "07:00",
      createdAt: new Date(Date.now() - 172800000).toISOString(),
    },
    {
      id: "seed-2",
      title: "Old Money Caption Series",
      content: "Wealth is not a display. It's a frequency. The right people recognise it without a label in sight. #QuietLuxury #OldMoney",
      type: "caption",
      platform: "Instagram Reels",
      niche: "Old Money Fashion",
      status: "posted",
      scheduledDay: dayStr(-1),
      scheduledTime: "09:00",
      createdAt: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: "seed-3",
      title: "Cinematic Morning Ritual",
      content: "Sequence of 5 close-up shots: espresso brewing, leather watch, sunlight through curtains, keys on marble, door closing.",
      type: "prompt",
      platform: "TikTok",
      niche: "Luxury Morning Routine",
      status: "scheduled",
      scheduledDay: dayStr(0),
      scheduledTime: "07:00",
      createdAt: new Date().toISOString(),
    },
    {
      id: "seed-4",
      title: "Silent Wealth Signals",
      content: "Things that signal real wealth — none of them have logos.",
      type: "hook",
      platform: "TikTok",
      niche: "Silent Wealth Signals",
      status: "scheduled",
      scheduledDay: dayStr(1),
      scheduledTime: "19:00",
      createdAt: new Date().toISOString(),
    },
    {
      id: "seed-5",
      title: "Dark Feminine Aesthetic Reel",
      content: "She looked at my bag. Then at me. Then she said, I didn't think anyone else knew about that brand.",
      type: "hook",
      platform: "Instagram Reels",
      niche: "Dark Feminine Aesthetic",
      status: "scheduled",
      scheduledDay: dayStr(2),
      scheduledTime: "20:00",
      createdAt: new Date().toISOString(),
    },
    {
      id: "seed-6",
      title: "Wealth Mindset Caption",
      content: "The most expensive thing I own is my standard. Because once you raise it, you can't unknow what quality actually feels like.",
      type: "caption",
      platform: "Pinterest",
      niche: "Minimalist Wealth Flex",
      status: "draft",
      scheduledDay: dayStr(3),
      scheduledTime: null,
      createdAt: new Date().toISOString(),
    },
    {
      id: "seed-7",
      title: "Brand Audit Video Idea",
      content: "Film yourself going through your wardrobe and removing everything with a visible logo. React to what's left. The reveal is the content.",
      type: "idea",
      platform: "YouTube Shorts",
      niche: "Old Money Fashion",
      status: "draft",
      scheduledDay: dayStr(4),
      scheduledTime: null,
      createdAt: new Date().toISOString(),
    },
  ];
}

export function loadCalendar(): CalendarPost[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = seed();
      saveCalendar(initial);
      return initial;
    }
    return JSON.parse(raw) as CalendarPost[];
  } catch {
    return seed();
  }
}

export function saveCalendar(posts: CalendarPost[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
  } catch {}
}

export function addPost(posts: CalendarPost[], post: Omit<CalendarPost, "id" | "createdAt">): CalendarPost[] {
  const newPost: CalendarPost = {
    ...post,
    id: `post-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    createdAt: new Date().toISOString(),
  };
  const updated = [...posts, newPost];
  saveCalendar(updated);
  return updated;
}

export function updatePost(posts: CalendarPost[], id: string, changes: Partial<CalendarPost>): CalendarPost[] {
  const updated = posts.map(p => p.id === id ? { ...p, ...changes } : p);
  saveCalendar(updated);
  return updated;
}

export function deletePost(posts: CalendarPost[], id: string): CalendarPost[] {
  const updated = posts.filter(p => p.id !== id);
  saveCalendar(updated);
  return updated;
}

export function movePost(posts: CalendarPost[], id: string, newDay: string, newTime?: string | null): CalendarPost[] {
  const updated = posts.map(p =>
    p.id === id
      ? { ...p, scheduledDay: newDay, scheduledTime: newTime !== undefined ? newTime : p.scheduledTime }
      : p
  );
  saveCalendar(updated);
  return updated;
}

export function saveToCalendar(
  posts: CalendarPost[],
  content: string,
  type: PostType,
  platform: CalendarPlatform,
  niche: string,
  scheduledDay: string
): CalendarPost[] {
  const typeLabels: Record<PostType, string> = {
    hook: "Hook", caption: "Caption", prompt: "Cinematic Prompt", idea: "Viral Idea", custom: "Post",
  };
  return addPost(posts, {
    title: `${typeLabels[type]} — ${niche.split(" ").slice(0, 2).join(" ")}`,
    content,
    type,
    platform,
    niche,
    status: "draft",
    scheduledDay,
    scheduledTime: null,
  });
}

// Week helpers
export function getWeekDays(weekOffset: number): string[] {
  const today = new Date();
  today.setDate(today.getDate() + weekOffset * 7);
  const dayOfWeek = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((dayOfWeek + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d.toISOString().slice(0, 10);
  });
}

export function formatDay(dateStr: string): { weekday: string; date: string; isToday: boolean } {
  const d = new Date(dateStr + "T12:00:00");
  const today = new Date().toISOString().slice(0, 10);
  return {
    weekday: d.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase(),
    date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    isToday: dateStr === today,
  };
}

export function formatWeekRange(days: string[]): string {
  const first = new Date(days[0] + "T12:00:00");
  const last = new Date(days[6] + "T12:00:00");
  const fmt = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${fmt(first)} – ${fmt(last)}`;
}

// AI posting windows per platform
export const AI_WINDOWS: Record<CalendarPlatform, { time: string; label: string; stars: number }[]> = {
  TikTok: [
    { time: "07:00", label: "Morning commute peak", stars: 5 },
    { time: "12:00", label: "Lunch scroll window", stars: 4 },
    { time: "19:00", label: "Evening prime time", stars: 5 },
  ],
  "Instagram Reels": [
    { time: "09:00", label: "Pre-work browse", stars: 4 },
    { time: "13:00", label: "Lunchtime engagement", stars: 5 },
    { time: "20:00", label: "Wind-down prime", stars: 4 },
  ],
  "YouTube Shorts": [
    { time: "12:00", label: "Midday peak", stars: 5 },
    { time: "15:00", label: "After-school surge", stars: 4 },
    { time: "21:00", label: "Night session", stars: 4 },
  ],
  Pinterest: [
    { time: "20:00", label: "Evening inspiration", stars: 5 },
    { time: "21:00", label: "Late planning window", stars: 5 },
    { time: "14:00", label: "Weekend afternoon", stars: 4 },
  ],
};

export const STATUS_CONFIG: Record<PostStatus, { label: string; color: string; bg: string; border: string }> = {
  draft: { label: "Draft", color: "text-muted-foreground", bg: "bg-muted/40", border: "border-muted/50" },
  scheduled: { label: "Scheduled", color: "text-primary", bg: "bg-primary/10", border: "border-primary/30" },
  posted: { label: "Posted", color: "text-chart-2", bg: "bg-chart-2/10", border: "border-chart-2/30" },
  viral: { label: "Viral", color: "text-chart-5", bg: "bg-chart-5/10", border: "border-chart-5/30" },
};

export const PLATFORM_ABBR: Record<CalendarPlatform, string> = {
  TikTok: "TK",
  "Instagram Reels": "IG",
  "YouTube Shorts": "YT",
  Pinterest: "PIN",
};

export { NICHES, PLATFORMS, STATUSES };
