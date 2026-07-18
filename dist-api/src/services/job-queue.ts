/**
 * Background Job Queue — simple in-memory job state machine.
 *
 * Supports: pending → running → completed | failed → (retry) → pending
 * Exposed via GET /api/intelligence/jobs for the ECC status panel.
 *
 * Usage:
 *   const id = jobQueue.enqueue("Gemini Health Check", async () => { ... });
 *   jobQueue.getAll()   // → Job[]
 *   jobQueue.getStats() // → { pending, running, completed, failed }
 */

// ── Types ──────────────────────────────────────────────────────────────────

export type JobState = "pending" | "running" | "completed" | "failed" | "retrying";

export interface Job {
  id:           string;
  name:         string;
  state:        JobState;
  createdAt:    string;
  startedAt?:   string;
  completedAt?: string;
  error?:       string;
  result?:      unknown;
  attempts:     number;
  maxAttempts:  number;
  priority:     number;
}

export interface JobStats {
  pending:   number;
  running:   number;
  completed: number;
  failed:    number;
  retrying:  number;
  total:     number;
}

type JobTask = () => Promise<unknown>;

// ── Queue ──────────────────────────────────────────────────────────────────

class JobQueue {
  private readonly jobs: Job[] = [];
  private readonly tasks = new Map<string, JobTask>();
  private readonly maxJobs = 200;

  enqueue(
    name: string,
    task: JobTask,
    opts?: { maxAttempts?: number; priority?: number },
  ): string {
    const id = crypto.randomUUID();
    const job: Job = {
      id,
      name,
      state:       "pending",
      createdAt:   new Date().toISOString(),
      attempts:    0,
      maxAttempts: opts?.maxAttempts ?? 3,
      priority:    opts?.priority ?? 5,
    };

    this.jobs.unshift(job);
    this.tasks.set(id, task);

    // Trim old completed/failed jobs to stay under maxJobs
    if (this.jobs.length > this.maxJobs) {
      const removable = this.jobs
        .map((j, i) => ({ j, i }))
        .filter(({ j }) => j.state === "completed" || j.state === "failed")
        .slice(this.maxJobs / 2);
      for (const { i } of removable.reverse()) {
        const [removed] = this.jobs.splice(i, 1);
        this.tasks.delete(removed.id);
      }
    }

    // Run immediately in background
    this.run(id);

    return id;
  }

  private async run(id: string): Promise<void> {
    const job = this.jobs.find(j => j.id === id);
    const task = this.tasks.get(id);
    if (!job || !task) return;

    job.state     = "running";
    job.startedAt = new Date().toISOString();
    job.attempts++;

    try {
      job.result      = await task();
      job.state       = "completed";
      job.completedAt = new Date().toISOString();
    } catch (err: any) {
      job.error = String(err?.message ?? err);
      if (job.attempts < job.maxAttempts) {
        job.state = "retrying";
        const delay = Math.min(1000 * 2 ** (job.attempts - 1), 30_000);
        setTimeout(() => this.run(id), delay);
      } else {
        job.state       = "failed";
        job.completedAt = new Date().toISOString();
      }
    }
  }

  async runNow(id: string): Promise<void> {
    const job = this.jobs.find(j => j.id === id);
    if (!job) throw new Error(`Job ${id} not found`);
    if (job.state === "running") throw new Error(`Job ${id} is already running`);
    job.error       = undefined;
    job.completedAt = undefined;
    job.startedAt   = undefined;
    await this.run(id);
  }

  getAll(): Job[] {
    return [...this.jobs];
  }

  get(id: string): Job | undefined {
    return this.jobs.find(j => j.id === id);
  }

  getStats(): JobStats {
    const stats: JobStats = { pending: 0, running: 0, completed: 0, failed: 0, retrying: 0, total: 0 };
    for (const j of this.jobs) {
      stats[j.state]++;
      stats.total++;
    }
    return stats;
  }

  getRecent(n = 20): Job[] {
    return this.jobs.slice(0, n);
  }
}

export const jobQueue = new JobQueue();
