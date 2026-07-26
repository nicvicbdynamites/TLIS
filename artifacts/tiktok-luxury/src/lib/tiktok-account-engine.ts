export type TikTokAccountStatus = "active" | "inactive" | "suspended" | "pending";

export interface TikTokAccountInput {
  accountName: string;
  username?: string;
  email?: string;
  phone?: string;
  country?: string;
  timezone?: string;
  language?: string;
  workspaceId?: string | null;
  status?: TikTokAccountStatus;
  notes?: string;
  hasPassword?: boolean;
}

export interface TikTokAccountRecord extends Required<Omit<TikTokAccountInput, "workspaceId" | "status">> {
  id: string;
  userId: string;
  workspaceId: string | null;
  status: TikTokAccountStatus;
  createdAt: string;
  updatedAt: string;
}

export interface TikTokAccountAuthAdapter {
  getUserId: () => Promise<string | null>;
}

export interface TikTokAccountStorageAdapter {
  list: (userId: string, options?: { page?: number; pageSize?: number }) => Promise<TikTokAccountRecord[]>;
  getById: (id: string) => Promise<TikTokAccountRecord | null>;
  create: (record: TikTokAccountRecord) => Promise<TikTokAccountRecord>;
  update: (record: TikTokAccountRecord) => Promise<TikTokAccountRecord>;
  delete: (id: string) => Promise<void>;
}

export class TikTokAccountEngineError extends Error {
  constructor(
    public readonly code: "validation_failed" | "session_expired" | "permission_denied" | "database_offline",
    message: string,
  ) {
    super(message);
    this.name = "TikTokAccountEngineError";
  }
}

interface TikTokAccountEngineOptions {
  auth: TikTokAccountAuthAdapter;
  storage: TikTokAccountStorageAdapter;
}

function normalizeInput(input: TikTokAccountInput): TikTokAccountInput {
  return {
    accountName: input.accountName?.trim() ?? "",
    username: input.username?.trim() ?? "",
    email: input.email?.trim() ?? "",
    phone: input.phone?.trim() ?? "",
    country: input.country?.trim() ?? "",
    timezone: input.timezone?.trim() ?? "",
    language: input.language?.trim() ?? "",
    workspaceId: input.workspaceId ?? null,
    status: input.status ?? "active",
    notes: input.notes?.trim() ?? "",
    hasPassword: input.hasPassword ?? false,
  };
}

function validateInput(input: TikTokAccountInput): void {
  const normalized = normalizeInput(input);
  if (!normalized.accountName) {
    throw new TikTokAccountEngineError("validation_failed", "Account name is required.");
  }
  if (normalized.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized.email)) {
    throw new TikTokAccountEngineError("validation_failed", "Email must be a valid address.");
  }
}

export function createTikTokAccountEngine({ auth, storage }: TikTokAccountEngineOptions) {
  const ensureAuthenticatedUser = async (): Promise<string> => {
    const userId = await auth.getUserId();
    if (!userId) {
      throw new TikTokAccountEngineError("session_expired", "Your session has expired. Please sign in again.");
    }
    return userId;
  };

  const wrapStorageError = async <T>(operation: () => Promise<T>): Promise<T> => {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof TikTokAccountEngineError) throw error;
      throw new TikTokAccountEngineError("database_offline", "We could not reach the account database. Please try again.");
    }
  };

  return {
    async create(input: TikTokAccountInput): Promise<TikTokAccountRecord> {
      validateInput(input);
      const userId = await ensureAuthenticatedUser();
      const now = new Date().toISOString();
      const normalized = normalizeInput(input);
      const record: TikTokAccountRecord = {
        id: crypto.randomUUID(),
        userId,
        workspaceId: normalized.workspaceId ?? null,
        accountName: normalized.accountName,
        username: normalized.username ?? "",
        email: normalized.email ?? "",
        phone: normalized.phone ?? "",
        country: normalized.country ?? "",
        timezone: normalized.timezone ?? "",
        language: normalized.language ?? "",
        status: normalized.status ?? "active",
        notes: normalized.notes ?? "",
        hasPassword: normalized.hasPassword ?? false,
        createdAt: now,
        updatedAt: now,
      };
      return wrapStorageError(() => storage.create(record));
    },

    async list(options?: { page?: number; pageSize?: number }): Promise<TikTokAccountRecord[]> {
      const userId = await ensureAuthenticatedUser();
      return wrapStorageError(() => storage.list(userId, options));
    },

    async update(id: string, patch: Partial<TikTokAccountInput>): Promise<TikTokAccountRecord> {
      const userId = await ensureAuthenticatedUser();
      const existing = await wrapStorageError(() => storage.getById(id));
      if (!existing) {
        throw new TikTokAccountEngineError("validation_failed", "Account was not found.");
      }
      if (existing.userId !== userId) {
        throw new TikTokAccountEngineError("permission_denied", "You do not have permission to update this account.");
      }

      const nextInput = normalizeInput({ ...existing, ...patch });
      const next: TikTokAccountRecord = {
        ...existing,
        ...nextInput,
        workspaceId: nextInput.workspaceId ?? null,
        status: nextInput.status ?? existing.status,
        hasPassword: nextInput.hasPassword ?? existing.hasPassword,
        updatedAt: new Date().toISOString(),
      };
      return wrapStorageError(() => storage.update(next));
    },

    async delete(id: string): Promise<void> {
      const userId = await ensureAuthenticatedUser();
      const existing = await wrapStorageError(() => storage.getById(id));
      if (!existing) {
        throw new TikTokAccountEngineError("validation_failed", "Account was not found.");
      }
      if (existing.userId !== userId) {
        throw new TikTokAccountEngineError("permission_denied", "You do not have permission to delete this account.");
      }
      return wrapStorageError(() => storage.delete(id));
    },
  };
}
