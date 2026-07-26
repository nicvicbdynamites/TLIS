import assert from "node:assert/strict";
import test from "node:test";
import {
  createWorkspaceEngine,
  WorkspaceEngineError,
  type WorkspaceAuthAdapter,
  type WorkspaceInput,
  type WorkspaceRecord,
  type WorkspaceStorageAdapter,
} from "./workspace-engine";

function buildRecord(overrides: Partial<WorkspaceRecord> = {}): WorkspaceRecord {
  return {
    id: overrides.id ?? "ws-1",
    userId: overrides.userId ?? "user-1",
    createdAt: overrides.createdAt ?? "2024-01-01T00:00:00.000Z",
    updatedAt: overrides.updatedAt ?? "2024-01-01T00:00:00.000Z",
    workspaceName: overrides.workspaceName ?? "My Workspace",
    accountName: overrides.accountName ?? "",
    username: overrides.username ?? "",
    platform: overrides.platform ?? "TikTok",
    niche: overrides.niche ?? "Luxury Fashion",
    audience: overrides.audience ?? "Luxury Aspirants",
    goal: overrides.goal ?? "Grow Followers",
    postingFrequency: overrides.postingFrequency ?? "Weekly",
    status: overrides.status ?? "active",
    notes: overrides.notes ?? "",
  };
}

function createMemoryStorage(initial: WorkspaceRecord[] = []): WorkspaceStorageAdapter {
  const rows = [...initial];
  return {
    async list(userId: string, options?: { page?: number; pageSize?: number }) {
      const page = options?.page ?? 1;
      const pageSize = options?.pageSize ?? 50;
      return rows
        .filter((row) => row.userId === userId)
        .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
        .slice((page - 1) * pageSize, page * pageSize);
    },
    async getById(id: string) {
      return rows.find((row) => row.id === id) ?? null;
    },
    async create(record: WorkspaceRecord) {
      rows.push(record);
      return record;
    },
    async update(record: WorkspaceRecord) {
      const index = rows.findIndex((row) => row.id === record.id);
      if (index >= 0) rows[index] = record;
      else rows.push(record);
      return record;
    },
    async delete(id: string) {
      const index = rows.findIndex((row) => row.id === id);
      if (index >= 0) rows.splice(index, 1);
    },
  };
}

test("create workspace stores a live record for the authenticated user", async () => {
  const storage = createMemoryStorage();
  const auth: WorkspaceAuthAdapter = { getUserId: async () => "user-1" };
  const engine = createWorkspaceEngine({ auth, storage });

  const record = await engine.create({
    workspaceName: "Luxury Brand",
    accountName: "Brand",
    username: "brand",
    platform: "TikTok",
    niche: "Luxury Fashion",
    audience: "Luxury Aspirants",
    goal: "Grow Followers",
    postingFrequency: "Weekly",
    status: "active",
    notes: "",
  });

  assert.equal(record.workspaceName, "Luxury Brand");
  assert.equal(record.userId, "user-1");
});

test("read workspace lists only the current user's workspaces and orders by recency", async () => {
  const storage = createMemoryStorage([
    buildRecord({ id: "old", userId: "user-1", createdAt: "2024-01-01T00:00:00.000Z" }),
    buildRecord({ id: "new", userId: "user-1", createdAt: "2024-02-01T00:00:00.000Z" }),
    buildRecord({ id: "other", userId: "user-2", createdAt: "2024-03-01T00:00:00.000Z" }),
  ]);
  const auth: WorkspaceAuthAdapter = { getUserId: async () => "user-1" };
  const engine = createWorkspaceEngine({ auth, storage });

  const list = await engine.list({ page: 1, pageSize: 10 });

  assert.deepEqual(list.map((item) => item.id), ["new", "old"]);
});

test("update workspace changes the persisted values", async () => {
  const storage = createMemoryStorage([buildRecord({ id: "ws-1", userId: "user-1" })]);
  const auth: WorkspaceAuthAdapter = { getUserId: async () => "user-1" };
  const engine = createWorkspaceEngine({ auth, storage });

  const updated = await engine.update("ws-1", {
    workspaceName: "Renamed Workspace",
    notes: "Updated strategy",
  });

  assert.equal(updated.workspaceName, "Renamed Workspace");
  assert.equal(updated.notes, "Updated strategy");
});

test("delete workspace removes the record for the current user", async () => {
  const storage = createMemoryStorage([buildRecord({ id: "ws-1", userId: "user-1" })]);
  const auth: WorkspaceAuthAdapter = { getUserId: async () => "user-1" };
  const engine = createWorkspaceEngine({ auth, storage });

  await engine.delete("ws-1");

  const remaining = await storage.list("user-1");
  assert.deepEqual(remaining, []);
});

test("unauthorized access rejects updates for other users", async () => {
  const storage = createMemoryStorage([buildRecord({ id: "ws-1", userId: "user-2" })]);
  const auth: WorkspaceAuthAdapter = { getUserId: async () => "user-1" };
  const engine = createWorkspaceEngine({ auth, storage });

  await assert.rejects(() => engine.update("ws-1", { workspaceName: "Nope" }), (error: unknown) => {
    assert.ok(error instanceof WorkspaceEngineError);
    assert.equal(error.code, "permission_denied");
    return true;
  });
});

test("session expired rejects create operations without an authenticated user", async () => {
  const storage = createMemoryStorage();
  const auth: WorkspaceAuthAdapter = { getUserId: async () => null };
  const engine = createWorkspaceEngine({ auth, storage });

  await assert.rejects(() => engine.create({ workspaceName: "No auth" }), (error: unknown) => {
    assert.ok(error instanceof WorkspaceEngineError);
    assert.equal(error.code, "session_expired");
    return true;
  });
});

test("database offline surfaces a clear error", async () => {
  const storage: WorkspaceStorageAdapter = {
    async list() { throw new Error("network down"); },
    async getById() { throw new Error("network down"); },
    async create() { throw new Error("network down"); },
    async update() { throw new Error("network down"); },
    async delete() { throw new Error("network down"); },
  };
  const auth: WorkspaceAuthAdapter = { getUserId: async () => "user-1" };
  const engine = createWorkspaceEngine({ auth, storage });

  await assert.rejects(() => engine.list({ page: 1, pageSize: 10 }), (error: unknown) => {
    assert.ok(error instanceof WorkspaceEngineError);
    assert.equal(error.code, "database_offline");
    return true;
  });
});
