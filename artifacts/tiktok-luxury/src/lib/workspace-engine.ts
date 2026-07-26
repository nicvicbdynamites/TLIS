export type WorkspaceStatus = "active" | "paused" | "archived";

export interface WorkspaceInput {
  workspaceName: string;
  accountName?: string;
  username?: string;
  platform?: string;
  niche?: string;
  audience?: string;
  goal?: string;
  postingFrequency?: string;
  status?: WorkspaceStatus;
  notes?: string;
}

export interface WorkspaceRecord extends Required<Omit<WorkspaceInput, "status">> {
  id: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  status: WorkspaceStatus;
}

export interface WorkspaceAuthAdapter {
  getUserId: () => Promise<string | null>;
}

export interface WorkspaceStorageAdapter {
  list: (userId: string, options?: { page?: number; pageSize?: number }) => Promise<WorkspaceRecord[]>;
  getById: (id: string) => Promise<WorkspaceRecord | null>;
  create: (record: WorkspaceRecord) => Promise<WorkspaceRecord>;
  update: (record: WorkspaceRecord) => Promise<WorkspaceRecord>;
  delete: (id: string) => Promise<void>;
}

export class WorkspaceEngineError extends Error {
  constructor(
    public readonly code: "validation_failed" | "session_expired" | "permission_denied" | "database_offline",
    message: string,
  ) {
    super(message);
    this.name = "WorkspaceEngineError";
  }
}

interface WorkspaceEngineOptions {
  auth: WorkspaceAuthAdapter;
  storage: WorkspaceStorageAdapter;
}

function normalizeInput(input: WorkspaceInput): WorkspaceInput {
  return {
    workspaceName: input.workspaceName?.trim() ?? "",
    accountName: input.accountName?.trim() ?? "",
    username: input.username?.trim() ?? "",
    platform: input.platform?.trim() || "TikTok",
    niche: input.niche?.trim() ?? "",
    audience: input.audience?.trim() ?? "",
    goal: input.goal?.trim() ?? "",
    postingFrequency: input.postingFrequency?.trim() ?? "",
    status: input.status ?? "active",
    notes: input.notes?.trim() ?? "",
  };
}

function validateInput(input: WorkspaceInput): void {
  const normalized = normalizeInput(input);
  if (!normalized.workspaceName) {
    throw new WorkspaceEngineError("validation_failed", "Workspace name is required.");
  }
}

export function createWorkspaceEngine({ auth, storage }: WorkspaceEngineOptions) {
  const ensureAuthenticatedUser = async (): Promise<string> => {
    const userId = await auth.getUserId();
    if (!userId) {
      throw new WorkspaceEngineError("session_expired", "Your session has expired. Please sign in again.");
    }
    return userId;
  };

  const wrapStorageError = async <T>(operation: () => Promise<T>): Promise<T> => {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof WorkspaceEngineError) throw error;
      throw new WorkspaceEngineError("database_offline", "We could not reach the workspace database. Please try again.");
    }
  };

  return {
    async create(input: WorkspaceInput): Promise<WorkspaceRecord> {
      validateInput(input);
      const userId = await ensureAuthenticatedUser();
      const now = new Date().toISOString();
      const normalized = normalizeInput(input);
      const record: WorkspaceRecord = {
        id: crypto.randomUUID(),
        userId,
        createdAt: now,
        updatedAt: now,
        workspaceName: normalized.workspaceName,
        accountName: normalized.accountName ?? "",
        username: normalized.username ?? "",
        platform: normalized.platform ?? "TikTok",
        niche: normalized.niche ?? "",
        audience: normalized.audience ?? "",
        goal: normalized.goal ?? "",
        postingFrequency: normalized.postingFrequency ?? "",
        status: normalized.status ?? "active",
        notes: normalized.notes ?? "",
      };

      return wrapStorageError(() => storage.create(record));
    },

    async list(options?: { page?: number; pageSize?: number }): Promise<WorkspaceRecord[]> {
      const userId = await ensureAuthenticatedUser();
      return wrapStorageError(() => storage.list(userId, options));
    },

    async update(id: string, patch: Partial<WorkspaceInput>): Promise<WorkspaceRecord> {
      const userId = await ensureAuthenticatedUser();
      const existing = await wrapStorageError(() => storage.getById(id));
      if (!existing) {
        throw new WorkspaceEngineError("validation_failed", "Workspace was not found.");
      }
      if (existing.userId !== userId) {
        throw new WorkspaceEngineError("permission_denied", "You do not have permission to update this workspace.");
      }

      const next: WorkspaceRecord = {
        ...existing,
        ...normalizeInput({ ...existing, ...patch }),
        updatedAt: new Date().toISOString(),
      };
      return wrapStorageError(() => storage.update(next));
    },

    async delete(id: string): Promise<void> {
      const userId = await ensureAuthenticatedUser();
      const existing = await wrapStorageError(() => storage.getById(id));
      if (!existing) {
        throw new WorkspaceEngineError("validation_failed", "Workspace was not found.");
      }
      if (existing.userId !== userId) {
        throw new WorkspaceEngineError("permission_denied", "You do not have permission to delete this workspace.");
      }
      return wrapStorageError(() => storage.delete(id));
    },
  };
}
