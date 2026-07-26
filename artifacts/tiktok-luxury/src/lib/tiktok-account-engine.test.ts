import assert from "node:assert/strict";
import test from "node:test";
import {
  createTikTokAccountEngine,
  TikTokAccountEngineError,
  type TikTokAccountAuthAdapter,
  type TikTokAccountInput,
  type TikTokAccountRecord,
  type TikTokAccountStorageAdapter,
} from "./tiktok-account-engine";

function buildRecord(overrides: Partial<TikTokAccountRecord> = {}): TikTokAccountRecord {
  return {
    id: overrides.id ?? "account-1",
    userId: overrides.userId ?? "user-1",
    workspaceId: overrides.workspaceId ?? null,
    accountName: overrides.accountName ?? "Main Brand",
    username: overrides.username ?? "brand",
    email: overrides.email ?? "brand@example.com",
    phone: overrides.phone ?? "+1 555 000 0000",
    country: overrides.country ?? "United States",
    timezone: overrides.timezone ?? "UTC-05:00 (New York / EST)",
    language: overrides.language ?? "English",
    status: overrides.status ?? "active",
    notes: overrides.notes ?? "",
    hasPassword: overrides.hasPassword ?? false,
    createdAt: overrides.createdAt ?? "2024-01-01T00:00:00.000Z",
    updatedAt: overrides.updatedAt ?? "2024-01-01T00:00:00.000Z",
  };
}

function createMemoryStorage(initial: TikTokAccountRecord[] = []): TikTokAccountStorageAdapter {
  const rows = [...initial];
  return {
    async list(userId: string) {
      return rows.filter((row) => row.userId === userId).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
    },
    async getById(id: string) {
      return rows.find((row) => row.id === id) ?? null;
    },
    async create(record: TikTokAccountRecord) {
      rows.push(record);
      return record;
    },
    async update(record: TikTokAccountRecord) {
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

test("create account stores a live record for the authenticated user", async () => {
  const storage = createMemoryStorage();
  const auth: TikTokAccountAuthAdapter = { getUserId: async () => "user-1" };
  const engine = createTikTokAccountEngine({ auth, storage });

  const record = await engine.create({
    accountName: "Luxury Brand",
    username: "luxurybrand",
    email: "luxury@example.com",
    country: "United States",
    timezone: "UTC-05:00 (New York / EST)",
    language: "English",
    status: "active",
    hasPassword: true,
  });

  assert.equal(record.accountName, "Luxury Brand");
  assert.equal(record.userId, "user-1");
  assert.equal(record.hasPassword, true);
});

test("list returns only the current user's accounts", async () => {
  const storage = createMemoryStorage([
    buildRecord({ id: "a-1", userId: "user-1", createdAt: "2024-01-01T00:00:00.000Z" }),
    buildRecord({ id: "a-2", userId: "user-1", createdAt: "2024-02-01T00:00:00.000Z" }),
    buildRecord({ id: "a-3", userId: "user-2", createdAt: "2024-03-01T00:00:00.000Z" }),
  ]);
  const auth: TikTokAccountAuthAdapter = { getUserId: async () => "user-1" };
  const engine = createTikTokAccountEngine({ auth, storage });

  const list = await engine.list({ page: 1, pageSize: 10 });

  assert.deepEqual(list.map((item) => item.id), ["a-2", "a-1"]);
});

test("update account changes the persisted values", async () => {
  const storage = createMemoryStorage([buildRecord({ id: "account-1", userId: "user-1" })]);
  const auth: TikTokAccountAuthAdapter = { getUserId: async () => "user-1" };
  const engine = createTikTokAccountEngine({ auth, storage });

  const updated = await engine.update("account-1", { accountName: "Renamed Brand", notes: "Updated strategy" });

  assert.equal(updated.accountName, "Renamed Brand");
  assert.equal(updated.notes, "Updated strategy");
});

test("delete account removes the record for the current user", async () => {
  const storage = createMemoryStorage([buildRecord({ id: "account-1", userId: "user-1" })]);
  const auth: TikTokAccountAuthAdapter = { getUserId: async () => "user-1" };
  const engine = createTikTokAccountEngine({ auth, storage });

  await engine.delete("account-1");

  const remaining = await storage.list("user-1");
  assert.deepEqual(remaining, []);
});

test("unauthorized access rejects updates for other users", async () => {
  const storage = createMemoryStorage([buildRecord({ id: "account-1", userId: "user-2" })]);
  const auth: TikTokAccountAuthAdapter = { getUserId: async () => "user-1" };
  const engine = createTikTokAccountEngine({ auth, storage });

  await assert.rejects(() => engine.update("account-1", { accountName: "Nope" }), (error: unknown) => {
    assert.ok(error instanceof TikTokAccountEngineError);
    assert.equal(error.code, "permission_denied");
    return true;
  });
});

test("session expired rejects create operations without an authenticated user", async () => {
  const storage = createMemoryStorage();
  const auth: TikTokAccountAuthAdapter = { getUserId: async () => null };
  const engine = createTikTokAccountEngine({ auth, storage });

  await assert.rejects(() => engine.create({ accountName: "No auth" }), (error: unknown) => {
    assert.ok(error instanceof TikTokAccountEngineError);
    assert.equal(error.code, "session_expired");
    return true;
  });
});

test("database offline surfaces a clear error", async () => {
  const storage: TikTokAccountStorageAdapter = {
    async list() { throw new Error("network down"); },
    async getById() { throw new Error("network down"); },
    async create() { throw new Error("network down"); },
    async update() { throw new Error("network down"); },
    async delete() { throw new Error("network down"); },
  };
  const auth: TikTokAccountAuthAdapter = { getUserId: async () => "user-1" };
  const engine = createTikTokAccountEngine({ auth, storage });

  await assert.rejects(() => engine.list({ page: 1, pageSize: 10 }), (error: unknown) => {
    assert.ok(error instanceof TikTokAccountEngineError);
    assert.equal(error.code, "database_offline");
    return true;
  });
});
