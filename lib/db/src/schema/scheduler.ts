import { pgTable, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const schedulerJobsTable = pgTable("scheduler_jobs", {
  id:          text("id").primaryKey(),
  name:        text("name").notNull(),
  intervalMs:  integer("interval_ms"),
  lastRunAt:   text("last_run_at"),
  nextRunAt:   text("next_run_at"),
  lastStatus:  text("last_status"),
  lastError:   text("last_error"),
  runCount:    integer("run_count").notNull().default(0),
  enabled:     boolean("enabled").notNull().default(true),
  updatedAt:   timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertSchedulerJobSchema = createInsertSchema(schedulerJobsTable).omit({ updatedAt: true });
export type InsertSchedulerJob = z.infer<typeof insertSchedulerJobSchema>;
export type SchedulerJobRow = typeof schedulerJobsTable.$inferSelect;
