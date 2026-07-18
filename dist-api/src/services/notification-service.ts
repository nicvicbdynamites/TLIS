/**
 * Intelligence Notification Service — push-style alerts for the ECC Live Feed.
 *
 * Emits events that the /api/intelligence/notifications SSE endpoint streams
 * to the frontend in real time.
 *
 * Usage:
 *   notificationService.push("trend", "New Trend", "Quiet luxury is surging", { severity: "success" });
 *   notificationService.getAll();
 */

import { EventEmitter } from "events";

// ── Types ──────────────────────────────────────────────────────────────────

export type NotificationType =
  | "trend"
  | "competitor"
  | "api_down"
  | "api_up"
  | "keyword"
  | "content"
  | "schedule"
  | "publish"
  | "error"
  | "info";

export type NotificationSeverity = "info" | "warning" | "error" | "success";

export interface Notification {
  id:       string;
  type:     NotificationType;
  title:    string;
  message:  string;
  severity: NotificationSeverity;
  timestamp: string;
  read:     boolean;
  provider?: string;
  data?:    Record<string, unknown>;
}

// ── Service ────────────────────────────────────────────────────────────────

class NotificationService extends EventEmitter {
  private readonly notifications: Notification[] = [];
  private readonly maxSize = 100;

  push(
    type: NotificationType,
    title: string,
    message: string,
    opts?: {
      severity?: NotificationSeverity;
      provider?: string;
      data?: Record<string, unknown>;
    },
  ): Notification {
    const n: Notification = {
      id:        crypto.randomUUID(),
      type,
      title,
      message,
      severity:  opts?.severity ?? "info",
      timestamp: new Date().toISOString(),
      read:      false,
      provider:  opts?.provider,
      data:      opts?.data,
    };

    this.notifications.unshift(n);
    if (this.notifications.length > this.maxSize) {
      this.notifications.splice(this.maxSize);
    }

    this.emit("notification", n);
    return n;
  }

  getAll(): Notification[] {
    return [...this.notifications];
  }

  getUnread(): Notification[] {
    return this.notifications.filter(n => !n.read);
  }

  getRecent(n = 20): Notification[] {
    return this.notifications.slice(0, n);
  }

  markRead(id: string): boolean {
    const n = this.notifications.find(n => n.id === id);
    if (!n) return false;
    n.read = true;
    return true;
  }

  markAllRead(): void {
    this.notifications.forEach(n => { n.read = true; });
  }

  unreadCount(): number {
    return this.notifications.filter(n => !n.read).length;
  }
}

export const notificationService = new NotificationService();
