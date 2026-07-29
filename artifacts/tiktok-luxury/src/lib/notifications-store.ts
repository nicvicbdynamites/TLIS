export interface SystemNotification {
  id: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error" | "trend" | "publish";
  timestamp: string;
  read: boolean;
  actionUrl?: string;
  campaignId?: string;
  category: "campaign" | "generation" | "publish" | "trend" | "system" | "health";
}

const NOTIFICATIONS_STORAGE_KEY = "tlis_notifications_v1";

const INITIAL_NOTIFICATIONS: SystemNotification[] = [
  {
    id: "notif-101",
    title: "Campaign Ready for Review",
    message: "Campaign 'Quiet Luxury GRWM Morning Routine' (@aether.luxury) has completed AI asset generation and is awaiting review.",
    type: "info",
    timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
    read: false,
    actionUrl: "/review-center?id=rev-101",
    campaignId: "rev-101",
    category: "campaign",
  },
  {
    id: "notif-102",
    title: "Video Generation Complete",
    message: "4K 60fps luxury reel 'Aesthetic Morning GRWM' was synthesized by Gemini 2.0 with 96% confidence.",
    type: "success",
    timestamp: new Date(Date.now() - 3600000 * 3).toISOString(),
    read: false,
    actionUrl: "/review-center?id=rev-101",
    campaignId: "rev-101",
    category: "generation",
  },
  {
    id: "notif-103",
    title: "New Trend Detected in Vault",
    message: "Viral trend alert: 'Silent Wealth Wardrobe Breakdown' reached 1.8M views across European luxury creators.",
    type: "trend",
    timestamp: new Date(Date.now() - 3600000 * 5).toISOString(),
    read: false,
    actionUrl: "/vault",
    category: "trend",
  },
  {
    id: "notif-104",
    title: "Publish Successful",
    message: "Campaign 'Monaco Yachting Evening Sunset Protocol' successfully posted to @aether.luxury on TikTok.",
    type: "publish",
    timestamp: new Date(Date.now() - 86400000 * 1).toISOString(),
    read: true,
    actionUrl: "/analytics",
    campaignId: "rev-105",
    category: "publish",
  },
  {
    id: "notif-105",
    title: "System Diagnostics Operational",
    message: "Supabase DB, Gemini 2.0 API, and TikTok Open API endpoints passed automated health check with 22ms latency.",
    type: "success",
    timestamp: new Date(Date.now() - 86400000 * 1.5).toISOString(),
    read: true,
    category: "health",
  },
];

export function getNotifications(): SystemNotification[] {
  try {
    const raw = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(INITIAL_NOTIFICATIONS));
      return INITIAL_NOTIFICATIONS;
    }
    const parsed = JSON.parse(raw) as SystemNotification[];
    return Array.isArray(parsed) ? parsed : INITIAL_NOTIFICATIONS;
  } catch {
    return INITIAL_NOTIFICATIONS;
  }
}

export function saveNotifications(items: SystemNotification[]): void {
  try {
    localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent("tlis_notifications_update"));
  } catch (err) {
    console.error("Failed to save notifications", err);
  }
}

export function pushNotification(notification: Omit<SystemNotification, "id" | "timestamp" | "read">): SystemNotification {
  const items = getNotifications();
  const newItem: SystemNotification = {
    ...notification,
    id: `notif-${Date.now().toString().slice(-6)}`,
    timestamp: new Date().toISOString(),
    read: false,
  };
  items.unshift(newItem);
  saveNotifications(items);
  return newItem;
}

export const addNotification = pushNotification;

export function markNotificationAsRead(id: string): void {
  const items = getNotifications();
  const index = items.findIndex(n => n.id === id);
  if (index !== -1) {
    items[index].read = true;
    saveNotifications(items);
  }
}

export function markAllNotificationsAsRead(): void {
  const items = getNotifications().map(n => ({ ...n, read: true }));
  saveNotifications(items);
}

export function clearAllNotifications(): void {
  saveNotifications([]);
}

export function getUnreadNotificationCount(): number {
  return getNotifications().filter(n => !n.read).length;
}
