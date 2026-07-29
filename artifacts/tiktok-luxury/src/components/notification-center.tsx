import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  Bell, CheckCheck, Trash2, ExternalLink,
  Sparkles, CheckCircle2, AlertTriangle, Send, Activity, ShieldCheck
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  clearAllNotifications,
  SystemNotification,
} from "@/lib/notifications-store";
import { cn } from "@/lib/utils";

export function NotificationCenter() {
  const [, navigate] = useLocation();
  const [notifications, setNotifications] = useState<SystemNotification[]>(() => getNotifications());
  const [open, setOpen] = useState(false);

  const loadNotifs = () => {
    setNotifications(getNotifications());
  };

  useEffect(() => {
    loadNotifs();
    window.addEventListener("tlis_notifications_update", loadNotifs);
    return () => window.removeEventListener("tlis_notifications_update", loadNotifs);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleActionClick = (notif: SystemNotification) => {
    markNotificationAsRead(notif.id);
    setOpen(false);
    if (notif.actionUrl) {
      navigate(notif.actionUrl);
    }
  };

  const getNotificationIcon = (type: SystemNotification["type"]) => {
    switch (type) {
      case "publish":
        return <Send className="h-3.5 w-3.5 text-chart-5" />;
      case "trend":
        return <Sparkles className="h-3.5 w-3.5 text-amber-400" />;
      case "success":
        return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />;
      case "warning":
      case "error":
        return <AlertTriangle className="h-3.5 w-3.5 text-destructive" />;
      case "info":
      default:
        return <ShieldCheck className="h-3.5 w-3.5 text-primary" />;
    }
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          id="btn-notification-center-trigger"
          aria-label="Notification Center"
          className="relative p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition border border-border/50 bg-background/50 shadow-sm"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[9px] font-bold text-black ring-2 ring-background animate-pulse">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-80 sm:w-96 p-0 bg-background/95 backdrop-blur-md border border-amber-500/20 shadow-2xl rounded-xl z-50 overflow-hidden"
      >
        <div className="p-3 bg-card/80 border-b border-border/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-amber-400" />
            <span className="text-xs font-semibold uppercase tracking-wider text-foreground">
              Notification Center
            </span>
            {unreadCount > 0 && (
              <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-amber-500/20 text-amber-300 font-mono border border-amber-500/30">
                {unreadCount} new
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => markAllNotificationsAsRead()}
              title="Mark all as read"
              className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-secondary text-[11px] flex items-center gap-1 transition"
            >
              <CheckCheck className="h-3 w-3" />
            </button>
            <button
              onClick={() => clearAllNotifications()}
              title="Clear all"
              className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 text-[11px] flex items-center gap-1 transition"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        </div>

        <div className="max-h-80 overflow-y-auto divide-y divide-border/40">
          {notifications.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground flex flex-col items-center justify-center gap-2">
              <Activity className="h-8 w-8 text-muted-foreground/30" />
              <span>No notifications at this time.</span>
            </div>
          ) : (
            notifications.map(notif => (
              <div
                key={notif.id}
                onClick={() => handleActionClick(notif)}
                className={cn(
                  "p-3.5 text-left transition cursor-pointer hover:bg-secondary/40 flex items-start gap-3 relative group",
                  !notif.read && "bg-amber-500/5"
                )}
              >
                {!notif.read && (
                  <div className="absolute left-1 top-4 h-1.5 w-1.5 rounded-full bg-amber-400" />
                )}
                <div className="p-1.5 rounded-lg border border-border/50 bg-card flex-shrink-0 mt-0.5">
                  {getNotificationIcon(notif.type)}
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between">
                    <p className={cn("text-xs font-medium truncate", !notif.read ? "text-foreground font-semibold" : "text-muted-foreground")}>
                      {notif.title}
                    </p>
                    <span className="text-[9px] text-muted-foreground/70 font-mono whitespace-nowrap ml-2">
                      {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                    {notif.message}
                  </p>
                  {notif.actionUrl && (
                    <div className="pt-1 flex items-center gap-1 text-[10px] text-primary group-hover:underline font-mono">
                      <span>View details</span>
                      <ExternalLink className="h-2.5 w-2.5" />
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
