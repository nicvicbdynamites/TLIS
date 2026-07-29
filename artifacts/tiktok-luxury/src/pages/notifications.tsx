import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  Bell, Check, CheckCheck, Trash2, Filter, Sparkles,
  ShieldCheck, AlertTriangle, TrendingUp, Info, ArrowRight, Clock
} from "lucide-react";
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  saveNotifications,
  type SystemNotification
} from "@/lib/notifications-store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function NotificationsPage() {
  const [, navigate] = useLocation();
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [filterCategory, setFilterCategory] = useState<string>("all");

  const loadData = () => {
    setNotifications(getNotifications());
  };

  useEffect(() => {
    loadData();
    window.addEventListener("tlis_notifications_update", loadData);
    return () => window.removeEventListener("tlis_notifications_update", loadData);
  }, []);

  const handleMarkAsRead = (id: string) => {
    markNotificationAsRead(id);
    loadData();
  };

  const handleMarkAllRead = () => {
    markAllNotificationsAsRead();
    loadData();
  };

  const handleClearAll = () => {
    saveNotifications([]);
    loadData();
  };

  const filtered = notifications.filter(n => {
    if (filterCategory === "all") return true;
    if (filterCategory === "unread") return !n.read;
    return n.category === filterCategory;
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  const getIcon = (type: SystemNotification["type"]) => {
    switch (type) {
      case "success": return <Check className="h-4 w-4 text-emerald-400" />;
      case "warning": return <AlertTriangle className="h-4 w-4 text-amber-400" />;
      case "error":   return <AlertTriangle className="h-4 w-4 text-destructive" />;
      case "trend":   return <TrendingUp className="h-4 w-4 text-primary" />;
      case "publish": return <Sparkles className="h-4 w-4 text-chart-5" />;
      default:        return <Info className="h-4 w-4 text-primary" />;
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-8">
      {/* Header Banner */}
      <div className="luxury-card p-6 border-primary/20 bg-gradient-to-br from-primary/10 via-background to-background">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-mono uppercase tracking-widest text-primary">System Dispatch</span>
              {unreadCount > 0 && (
                <Badge className="bg-primary text-primary-foreground text-[10px]">
                  {unreadCount} Unread
                </Badge>
              )}
            </div>
            <h1 className="text-2xl md:text-3xl font-serif font-bold luxury-gradient-text">
              Notification Center
            </h1>
            <p className="text-xs text-muted-foreground mt-1 max-w-xl">
              System alerts, campaign review status, AI generation benchmarks, and trend intelligence events.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAllRead}
              disabled={unreadCount === 0}
              className="border-primary/30 hover:bg-primary/10 text-xs gap-1.5"
            >
              <CheckCheck className="h-4 w-4 text-primary" />
              Mark All Read
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearAll}
              disabled={notifications.length === 0}
              className="text-xs text-muted-foreground hover:text-destructive gap-1.5"
            >
              <Trash2 className="h-4 w-4" />
              Clear All
            </Button>
          </div>
        </div>
      </div>

      {/* Filter Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-border">
        <Filter className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        {[
          { key: "all", label: "All Events" },
          { key: "unread", label: `Unread (${unreadCount})` },
          { key: "campaign", label: "Campaigns" },
          { key: "generation", label: "AI Generation" },
          { key: "trend", label: "Trends" },
          { key: "publish", label: "Publishing" },
          { key: "system", label: "System & Health" },
        ].map(cat => (
          <button
            key={cat.key}
            onClick={() => setFilterCategory(cat.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              filterCategory === cat.key
                ? "bg-primary text-primary-foreground"
                : "bg-muted/40 border border-border text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Notification List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="luxury-card p-12 text-center flex flex-col items-center justify-center gap-3">
            <Bell className="h-10 w-10 text-muted-foreground/30" />
            <h3 className="text-base font-semibold">No notifications found</h3>
            <p className="text-xs text-muted-foreground max-w-sm">
              All caught up! System alerts and campaign activity will appear here in real time.
            </p>
          </div>
        ) : (
          filtered.map(notif => (
            <div
              key={notif.id}
              className={`luxury-card p-5 border-border transition-all duration-200 ${
                !notif.read ? "border-l-4 border-l-primary bg-primary/5" : "opacity-80 hover:opacity-100"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3.5 flex-1 min-w-0">
                  <div className="p-2 rounded-lg bg-muted/60 flex-shrink-0 mt-0.5">
                    {getIcon(notif.type)}
                  </div>
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-semibold text-foreground">{notif.title}</h4>
                      <Badge variant="outline" className="text-[9px] uppercase font-mono tracking-wider border-border">
                        {notif.category}
                      </Badge>
                      {!notif.read && (
                        <span className="h-2 w-2 rounded-full bg-primary inline-block" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {notif.message}
                    </p>
                    <div className="flex items-center gap-4 pt-2 text-[10px] text-muted-foreground/70 font-mono">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(notif.timestamp).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {notif.actionUrl && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        handleMarkAsRead(notif.id);
                        navigate(notif.actionUrl!);
                      }}
                      className="border-primary/30 text-primary hover:bg-primary/10 text-xs gap-1 min-h-[36px]"
                    >
                      View <ArrowRight className="h-3 w-3" />
                    </Button>
                  )}
                  {!notif.read && (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleMarkAsRead(notif.id)}
                      className="h-8 w-8 text-muted-foreground hover:text-primary"
                      title="Mark as read"
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
