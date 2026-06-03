import { useState, useRef, useEffect } from "react";
import {
  ChevronLeft, ChevronRight, Plus, X, Clock, Trash2,
  Star, CalendarDays, CheckCircle2, Flame, Edit3, Check,
} from "lucide-react";
import {
  loadCalendar, saveCalendar, addPost, updatePost, deletePost, movePost,
  getWeekDays, formatDay, formatWeekRange,
  AI_WINDOWS, STATUS_CONFIG, PLATFORM_ABBR, NICHES, PLATFORMS, STATUSES,
  type CalendarPost, type PostStatus, type CalendarPlatform, type PostType,
} from "@/lib/calendar";
import {
  syncCalendarWithCloud, upsertPostToCloud, deletePostFromCloud,
} from "@/lib/supabase";
import { useSync } from "@/hooks/useSync";
import { SyncStatusBar } from "@/components/SyncStatus";

const ALL = "All";

const TYPE_LABELS: Record<PostType, string> = {
  hook: "Hook", caption: "Caption", prompt: "Prompt", idea: "Idea", custom: "Post",
};

const PLATFORM_COLORS: Record<CalendarPlatform, string> = {
  TikTok: "text-chart-5 bg-chart-5/10 border-chart-5/30",
  "Instagram Reels": "text-chart-2 bg-chart-2/10 border-chart-2/30",
  "YouTube Shorts": "text-destructive bg-destructive/10 border-destructive/30",
  Pinterest: "text-primary bg-primary/10 border-primary/30",
};

function Stars({ n }: { n: number }) {
  return (
    <span className="flex">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-2.5 w-2.5 ${i < n ? "text-primary fill-primary" : "text-muted-foreground/30"}`}
        />
      ))}
    </span>
  );
}

function StatusBadge({ status }: { status: PostStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-semibold uppercase tracking-wide ${cfg.color} ${cfg.bg} ${cfg.border} flex items-center gap-1`}>
      {status === "viral" && <Flame className="h-2.5 w-2.5" />}
      {status === "posted" && <CheckCircle2 className="h-2.5 w-2.5" />}
      {cfg.label}
    </span>
  );
}

interface NewPostForm {
  title: string;
  content: string;
  type: PostType;
  platform: CalendarPlatform;
  niche: string;
  status: PostStatus;
  scheduledDay: string;
  scheduledTime: string;
}

function NewPostModal({
  defaultDay,
  onSave,
  onClose,
}: {
  defaultDay: string;
  onSave: (form: NewPostForm) => void;
  onClose: () => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState<NewPostForm>({
    title: "",
    content: "",
    type: "hook",
    platform: "TikTok",
    niche: NICHES[0],
    status: "draft",
    scheduledDay: defaultDay || today,
    scheduledTime: "",
  });

  const set = (k: keyof NewPostForm, v: string) => setForm(f => ({ ...f, [k]: v }));
  const valid = form.title.trim() && form.content.trim();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="luxury-card w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="font-serif font-bold text-foreground">New Content Card</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs uppercase tracking-widest text-muted-foreground block mb-1.5">Title</label>
            <input
              value={form.title}
              onChange={e => set("title", e.target.value)}
              placeholder="E.g. Monday hook — Quiet Luxury"
              className="w-full bg-card border border-card-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-widest text-muted-foreground block mb-1.5">Content</label>
            <textarea
              value={form.content}
              onChange={e => set("content", e.target.value)}
              placeholder="Paste your hook, caption, or prompt here…"
              rows={4}
              className="w-full bg-card border border-card-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {(["type", "platform", "niche", "status"] as const).map(field => (
              <div key={field}>
                <label className="text-xs uppercase tracking-widest text-muted-foreground block mb-1.5">{field}</label>
                <div className="relative">
                  <select
                    value={form[field]}
                    onChange={e => set(field, e.target.value)}
                    className="w-full appearance-none bg-card border border-card-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50 pr-7"
                  >
                    {field === "type" && ["hook","caption","prompt","idea","custom"].map(v => <option key={v} value={v}>{TYPE_LABELS[v as PostType]}</option>)}
                    {field === "platform" && PLATFORMS.map(v => <option key={v} value={v}>{v}</option>)}
                    {field === "niche" && NICHES.map(v => <option key={v} value={v}>{v}</option>)}
                    {field === "status" && STATUSES.map(v => <option key={v} value={v}>{STATUS_CONFIG[v].label}</option>)}
                  </select>
                  <ChevronRight className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground rotate-90 pointer-events-none" />
                </div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs uppercase tracking-widest text-muted-foreground block mb-1.5">Date</label>
              <input
                type="date"
                value={form.scheduledDay}
                onChange={e => set("scheduledDay", e.target.value)}
                className="w-full bg-card border border-card-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50"
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-widest text-muted-foreground block mb-1.5">Time (optional)</label>
              <input
                type="time"
                value={form.scheduledTime}
                onChange={e => set("scheduledTime", e.target.value)}
                className="w-full bg-card border border-card-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50"
              />
            </div>
          </div>
        </div>
        <div className="p-5 border-t border-border flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2 rounded-lg text-sm border border-border text-muted-foreground hover:border-primary/30 hover:text-foreground transition-all">
            Cancel
          </button>
          <button
            onClick={() => valid && onSave(form)}
            disabled={!valid}
            className="flex-1 px-4 py-2 rounded-lg text-sm bg-primary/10 border border-primary/40 text-primary hover:bg-primary/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed font-medium"
          >
            Save Card
          </button>
        </div>
      </div>
    </div>
  );
}

function PostCard({
  post,
  onStatusChange,
  onDelete,
  onEdit,
  isDragging,
  onDragStart,
}: {
  post: CalendarPost;
  onStatusChange: (id: string, status: PostStatus) => void;
  onDelete: (id: string) => void;
  onEdit: (post: CalendarPost) => void;
  isDragging: boolean;
  onDragStart: (e: React.DragEvent, id: string) => void;
}) {
  const cfg = STATUS_CONFIG[post.status];
  const platCfg = PLATFORM_COLORS[post.platform] ?? "text-muted-foreground bg-muted/20 border-muted/30";

  return (
    <div
      draggable
      onDragStart={e => onDragStart(e, post.id)}
      className={`rounded-lg border p-2.5 cursor-grab active:cursor-grabbing transition-all duration-200 group select-none ${cfg.border} ${cfg.bg} ${isDragging ? "opacity-40 scale-95" : "hover:border-primary/40"}`}
    >
      <div className="flex items-start justify-between gap-1.5 mb-1.5">
        <div className="flex items-center gap-1.5 flex-wrap">
          <StatusBadge status={post.status} />
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${platCfg}`}>
            {PLATFORM_ABBR[post.platform]}
          </span>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={e => { e.stopPropagation(); onEdit(post); }}
            className="p-0.5 rounded text-muted-foreground hover:text-primary transition-colors"
          >
            <Edit3 className="h-3 w-3" />
          </button>
          <button
            onClick={e => { e.stopPropagation(); onDelete(post.id); }}
            className="p-0.5 rounded text-muted-foreground hover:text-destructive transition-colors"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>

      <p className="text-xs font-medium text-foreground leading-snug line-clamp-2 mb-1.5">{post.content}</p>

      <div className="flex items-center justify-between gap-1">
        {post.scheduledTime ? (
          <span className="text-[10px] text-muted-foreground font-mono flex items-center gap-1">
            <Clock className="h-2.5 w-2.5" />{post.scheduledTime}
          </span>
        ) : (
          <span className="text-[10px] text-muted-foreground/50">No time set</span>
        )}
        <span className="text-[10px] text-muted-foreground truncate max-w-[70px]">{TYPE_LABELS[post.type]}</span>
      </div>

      {post.status !== "posted" && post.status !== "viral" && (
        <div className="mt-2 pt-2 border-t border-border/50">
          <div className="flex gap-1">
            {(["draft", "scheduled", "posted", "viral"] as PostStatus[])
              .filter(s => s !== post.status)
              .slice(0, 2)
              .map(s => (
                <button
                  key={s}
                  onClick={e => { e.stopPropagation(); onStatusChange(post.id, s); }}
                  className={`text-[10px] px-1.5 py-0.5 rounded border transition-all hover:opacity-80 ${STATUS_CONFIG[s].color} ${STATUS_CONFIG[s].bg} ${STATUS_CONFIG[s].border}`}
                >
                  → {STATUS_CONFIG[s].label}
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function CalendarPage() {
  const [posts, setPosts] = useState<CalendarPost[]>(() => loadCalendar());
  const [weekOffset, setWeekOffset] = useState(0);
  const [filterPlatform, setFilterPlatform] = useState<string>(ALL);
  const [filterNiche, setFilterNiche] = useState<string>(ALL);
  const [filterStatus, setFilterStatus] = useState<string>(ALL);
  const [showModal, setShowModal] = useState(false);
  const [modalDefaultDay, setModalDefaultDay] = useState("");
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverDay, setDragOverDay] = useState<string | null>(null);
  const [editingPost, setEditingPost] = useState<CalendarPost | null>(null);
  const [activePlatformTab, setActivePlatformTab] = useState<CalendarPlatform>("TikTok");
  const [inlineEditId, setInlineEditId] = useState<string | null>(null);
  const [inlineNote, setInlineNote] = useState("");
  const sync = useSync();

  // Cloud sync on mount — merge local + cloud, cloud wins on ID conflicts
  useEffect(() => {
    sync.setSyncing();
    syncCalendarWithCloud(posts).then(({ posts: merged, synced }) => {
      if (synced) {
        setPosts(merged);
        saveCalendar(merged);
        sync.setSynced();
      } else {
        sync.setError("Cloud unavailable — local data in use");
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const weekDays = getWeekDays(weekOffset);
  const weekRange = formatWeekRange(weekDays);

  const filtered = posts.filter(p => {
    if (filterPlatform !== ALL && p.platform !== filterPlatform) return false;
    if (filterNiche !== ALL && p.niche !== filterNiche) return false;
    if (filterStatus !== ALL && p.status !== filterStatus) return false;
    return true;
  });

  const postsByDay: Record<string, CalendarPost[]> = {};
  weekDays.forEach(d => { postsByDay[d] = []; });
  filtered.forEach(p => {
    if (postsByDay[p.scheduledDay] !== undefined) {
      postsByDay[p.scheduledDay].push(p);
    }
  });

  const unscheduled = filtered.filter(p => !weekDays.includes(p.scheduledDay));

  // Stats
  const weekPosts = weekDays.flatMap(d => (postsByDay[d] ?? []));
  const statsAll = posts.filter(p => weekDays.includes(p.scheduledDay));
  const statsScheduled = statsAll.filter(p => p.status === "scheduled").length;
  const statsPosted = statsAll.filter(p => p.status === "posted").length;
  const statsViral = statsAll.filter(p => p.status === "viral").length;

  // Drag handlers
  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDragId(id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, day: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverDay(day);
  };

  const handleDrop = (e: React.DragEvent, day: string) => {
    e.preventDefault();
    if (dragId && day !== posts.find(p => p.id === dragId)?.scheduledDay) {
      const updated = movePost(posts, dragId, day);
      setPosts(updated);
      // Optimistic cloud sync
      const moved = updated.find(p => p.id === dragId);
      if (moved) upsertPostToCloud(moved).catch(() => null);
    }
    setDragId(null);
    setDragOverDay(null);
  };

  const handleDragEnd = () => {
    setDragId(null);
    setDragOverDay(null);
  };

  const handleStatusChange = (id: string, status: PostStatus) => {
    const updated = updatePost(posts, id, { status });
    setPosts(updated);
    const changed = updated.find(p => p.id === id);
    if (changed) upsertPostToCloud(changed).catch(() => null);
  };

  const handleDelete = (id: string) => {
    setPosts(deletePost(posts, id));
    deletePostFromCloud(id).catch(() => null);
  };

  const handleSaveNew = (form: ReturnType<typeof Object.fromEntries> | any) => {
    const updated = addPost(posts, {
      title: form.title,
      content: form.content,
      type: form.type,
      platform: form.platform,
      niche: form.niche,
      status: form.status,
      scheduledDay: form.scheduledDay,
      scheduledTime: form.scheduledTime || null,
    });
    setPosts(updated);
    // Sync the newest post to cloud
    const newest = updated[updated.length - 1];
    if (newest) upsertPostToCloud(newest).catch(() => null);
    setShowModal(false);
    setEditingPost(null);
  };

  const handleEdit = (post: CalendarPost) => {
    setEditingPost(post);
    setShowModal(true);
    setModalDefaultDay(post.scheduledDay);
  };

  const handleSaveEdit = (form: any) => {
    const updated = updatePost(posts, editingPost!.id, {
      title: form.title,
      content: form.content,
      type: form.type,
      platform: form.platform,
      niche: form.niche,
      status: form.status,
      scheduledDay: form.scheduledDay,
      scheduledTime: form.scheduledTime || null,
    });
    setPosts(updated);
    const changed = updated.find(p => p.id === editingPost!.id);
    if (changed) upsertPostToCloud(changed).catch(() => null);
    setShowModal(false);
    setEditingPost(null);
  };

  const applyWindow = (day: string, time: string) => {
    const dayPosts = postsByDay[day]?.filter(p => p.status === "scheduled" || p.status === "draft");
    if (dayPosts && dayPosts.length > 0) {
      const updated = updatePost(posts, dayPosts[0].id, { scheduledTime: time, status: "scheduled" });
      setPosts(updated);
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Module 08</p>
          <h1 className="text-3xl md:text-4xl font-serif font-bold luxury-gradient-text mb-1">Content Calendar</h1>
          <p className="text-muted-foreground text-sm">Seven-day command view. Every post, every platform, every optimal window.</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 bg-card border border-card-border rounded-lg px-3 py-2">
            <button onClick={() => setWeekOffset(w => w - 1)} className="text-muted-foreground hover:text-primary transition-colors">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-mono text-foreground min-w-[160px] text-center">{weekRange}</span>
            <button onClick={() => setWeekOffset(w => w + 1)} className="text-muted-foreground hover:text-primary transition-colors">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          {weekOffset !== 0 && (
            <button
              onClick={() => setWeekOffset(0)}
              className="px-3 py-2 rounded-lg text-xs border border-border text-muted-foreground hover:border-primary/40 hover:text-primary transition-all"
            >
              Today
            </button>
          )}
          <button
            onClick={() => { setEditingPost(null); setModalDefaultDay(new Date().toISOString().slice(0, 10)); setShowModal(true); }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm bg-primary/10 border border-primary/40 text-primary hover:bg-primary/20 transition-all font-medium"
          >
            <Plus className="h-4 w-4" />
            New Post
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "This Week", value: String(statsAll.length), sub: "total cards", icon: CalendarDays, color: "text-foreground" },
          { label: "Scheduled", value: String(statsScheduled), sub: "awaiting publish", icon: Clock, color: "text-primary" },
          { label: "Posted", value: String(statsPosted), sub: "live this week", icon: CheckCircle2, color: "text-chart-2" },
          { label: "Viral", value: String(statsViral), sub: "breaking out", icon: Flame, color: "text-chart-5" },
        ].map((s, i) => (
          <div key={i} className="luxury-card p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">{s.label}</p>
              <s.icon className={`h-4 w-4 ${s.color} opacity-60`} />
            </div>
            <p className={`text-2xl font-serif font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 flex-wrap">
        <span className="text-xs text-muted-foreground uppercase tracking-wider flex-shrink-0">Filter:</span>
        {PLATFORMS.map(p => (
          <button key={p} onClick={() => setFilterPlatform(filterPlatform === p ? ALL : p)}
            className={`flex-shrink-0 text-xs px-2.5 py-1 rounded-full border transition-all ${filterPlatform === p ? "bg-primary/10 border-primary/40 text-primary" : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground"}`}>
            {PLATFORM_ABBR[p as CalendarPlatform]}
          </button>
        ))}
        <div className="h-4 w-px bg-border mx-1" />
        {(["draft","scheduled","posted","viral"] as PostStatus[]).map(s => (
          <button key={s} onClick={() => setFilterStatus(filterStatus === s ? ALL : s)}
            className={`flex-shrink-0 text-xs px-2.5 py-1 rounded-full border transition-all ${filterStatus === s ? `${STATUS_CONFIG[s].color} ${STATUS_CONFIG[s].bg} ${STATUS_CONFIG[s].border}` : "border-border text-muted-foreground hover:border-primary/30"}`}>
            {STATUS_CONFIG[s].label}
          </button>
        ))}
        {(filterPlatform !== ALL || filterStatus !== ALL || filterNiche !== ALL) && (
          <button onClick={() => { setFilterPlatform(ALL); setFilterStatus(ALL); setFilterNiche(ALL); }}
            className="flex-shrink-0 text-xs px-2.5 py-1 rounded-full border border-destructive/30 text-destructive hover:bg-destructive/10 transition-all">
            Clear
          </button>
        )}
      </div>

      {/* Main grid + sidebar */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Calendar grid */}
        <div className="xl:col-span-3">
          <div className="overflow-x-auto">
            <div className="grid grid-cols-7 gap-2 min-w-[700px]">
              {weekDays.map(day => {
                const { weekday, date, isToday } = formatDay(day);
                const dayPosts = postsByDay[day] ?? [];
                const isOver = dragOverDay === day;

                return (
                  <div
                    key={day}
                    onDragOver={e => handleDragOver(e, day)}
                    onDrop={e => handleDrop(e, day)}
                    onDragLeave={() => setDragOverDay(null)}
                    className={`flex flex-col min-h-[380px] rounded-xl border transition-all duration-200 ${
                      isOver
                        ? "border-primary/60 bg-primary/5 scale-[1.01]"
                        : isToday
                        ? "border-primary/30 bg-primary/5"
                        : "border-border bg-card/50"
                    }`}
                  >
                    {/* Day header */}
                    <div className={`flex flex-col items-center py-3 border-b ${isToday ? "border-primary/20" : "border-border"}`}>
                      <span className={`text-[10px] font-semibold uppercase tracking-widest ${isToday ? "text-primary" : "text-muted-foreground"}`}>
                        {weekday}
                      </span>
                      <span className={`text-lg font-serif font-bold ${isToday ? "text-primary" : "text-foreground"}`}>
                        {date.split(" ")[1]}
                      </span>
                      <span className="text-[10px] text-muted-foreground">{date.split(" ")[0]}</span>
                      {isToday && <div className="h-1 w-1 rounded-full bg-primary mt-1" />}
                    </div>

                    {/* Posts */}
                    <div className="flex-1 p-2 space-y-2 overflow-y-auto">
                      {dayPosts
                        .slice()
                        .sort((a, b) => (a.scheduledTime ?? "99:99").localeCompare(b.scheduledTime ?? "99:99"))
                        .map(post => (
                          <PostCard
                            key={post.id}
                            post={post}
                            onStatusChange={handleStatusChange}
                            onDelete={handleDelete}
                            onEdit={handleEdit}
                            isDragging={dragId === post.id}
                            onDragStart={handleDragStart}
                          />
                        ))}
                    </div>

                    {/* Add button */}
                    <button
                      onClick={() => { setEditingPost(null); setModalDefaultDay(day); setShowModal(true); }}
                      className="m-2 flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-dashed border-border hover:border-primary/40 hover:bg-primary/5 text-xs text-muted-foreground hover:text-primary transition-all"
                    >
                      <Plus className="h-3 w-3" />
                      Add
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          {/* AI Windows */}
          <div className="luxury-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Star className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold uppercase tracking-widest text-foreground">AI Windows</h3>
            </div>

            <div className="flex gap-1 mb-4 overflow-x-auto pb-1">
              {PLATFORMS.map(p => (
                <button
                  key={p}
                  onClick={() => setActivePlatformTab(p as CalendarPlatform)}
                  className={`flex-shrink-0 text-[10px] px-2 py-1 rounded border transition-all ${
                    activePlatformTab === p
                      ? "bg-primary/10 border-primary/40 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/30"
                  }`}
                >
                  {PLATFORM_ABBR[p as CalendarPlatform]}
                </button>
              ))}
            </div>

            <div className="space-y-3">
              {AI_WINDOWS[activePlatformTab].map((w, i) => (
                <div key={i} className="flex items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono text-foreground">{w.time}</span>
                      <Stars n={w.stars} />
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{w.label}</p>
                  </div>
                  <button
                    onClick={() => {
                      const today = new Date().toISOString().slice(0, 10);
                      applyWindow(today, w.time);
                    }}
                    className="text-[10px] px-2 py-1 rounded border border-primary/30 text-primary hover:bg-primary/10 transition-all flex-shrink-0"
                  >
                    Apply
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Future Integrations</p>
              <div className="space-y-1.5">
                {["Auto-publish to TikTok", "Instagram API connect", "YouTube auto-upload", "Notification alerts"].map(item => (
                  <div key={item} className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/30 flex-shrink-0" />
                    <span className="text-[10px] text-muted-foreground/60">{item}</span>
                    <span className="ml-auto text-[10px] text-muted-foreground/40 font-mono">SOON</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Queue: posts outside this week */}
          <div className="luxury-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold uppercase tracking-widest text-foreground">Queue</h3>
              <span className="text-xs font-mono text-primary">{posts.filter(p => !weekDays.includes(p.scheduledDay)).length}</span>
            </div>

            {posts.filter(p => !weekDays.includes(p.scheduledDay)).length === 0 ? (
              <p className="text-xs text-muted-foreground/60 text-center py-4">All posts are on this week's calendar.</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {posts
                  .filter(p => !weekDays.includes(p.scheduledDay))
                  .slice(0, 10)
                  .map(post => (
                    <div
                      key={post.id}
                      draggable
                      onDragStart={e => handleDragStart(e, post.id)}
                      className="flex items-start gap-2 p-2.5 rounded-lg border border-border hover:border-primary/30 cursor-grab transition-all group"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          <StatusBadge status={post.status} />
                        </div>
                        <p className="text-xs text-foreground line-clamp-1">{post.content}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">{post.scheduledDay}</p>
                      </div>
                      <button
                        onClick={() => handleDelete(post.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* Niche filter */}
          <div className="luxury-card p-5">
            <h3 className="text-sm font-semibold uppercase tracking-widest text-foreground mb-3">Filter by Niche</h3>
            <div className="space-y-1.5">
              <button
                onClick={() => setFilterNiche(ALL)}
                className={`w-full text-left text-xs px-3 py-2 rounded-lg border transition-all ${filterNiche === ALL ? "bg-primary/10 border-primary/40 text-primary" : "border-border text-muted-foreground hover:border-primary/30"}`}
              >
                All Niches
              </button>
              {NICHES.map(n => (
                <button
                  key={n}
                  onClick={() => setFilterNiche(filterNiche === n ? ALL : n)}
                  className={`w-full text-left text-xs px-3 py-2 rounded-lg border transition-all ${filterNiche === n ? "bg-primary/10 border-primary/40 text-primary" : "border-border text-muted-foreground hover:border-primary/30"}`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <NewPostModal
          defaultDay={modalDefaultDay}
          onSave={editingPost ? handleSaveEdit : handleSaveNew}
          onClose={() => { setShowModal(false); setEditingPost(null); }}
        />
      )}
    </div>
  );
}
