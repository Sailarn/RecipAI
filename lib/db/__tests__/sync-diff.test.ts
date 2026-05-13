import { describe, expect, it } from "vitest";
import { computeDiff } from "../sync-diff";

interface Item {
  id: string;
  updatedAt: Date;
}

const d1 = new Date("2024-01-01T00:00:00.000Z");
const d2 = new Date("2024-01-02T00:00:00.000Z");

describe("computeDiff", () => {
  it("returns all empty arrays when both sides are empty", () => {
    const result = computeDiff<Item>([], []);
    expect(result.serverOnly).toEqual([]);
    expect(result.localOnly).toEqual([]);
    expect(result.conflicted).toEqual([]);
    expect(result.identical).toEqual([]);
  });

  it("detects server_only items (on server, not local)", () => {
    const server: Item[] = [{ id: "s1", updatedAt: d1 }];
    const result = computeDiff<Item>([], server);
    expect(result.serverOnly).toHaveLength(1);
    expect(result.serverOnly[0].id).toBe("s1");
    expect(result.localOnly).toHaveLength(0);
    expect(result.conflicted).toHaveLength(0);
  });

  it("detects local_only items (on local, not server)", () => {
    const local: Item[] = [{ id: "l1", updatedAt: d1 }];
    const result = computeDiff<Item>(local, []);
    expect(result.localOnly).toHaveLength(1);
    expect(result.localOnly[0].id).toBe("l1");
    expect(result.serverOnly).toHaveLength(0);
    expect(result.conflicted).toHaveLength(0);
  });

  it("detects identical items (same id, same updatedAt ms)", () => {
    const item: Item = { id: "same", updatedAt: d1 };
    const result = computeDiff<Item>([item], [item]);
    expect(result.identical).toHaveLength(1);
    expect(result.identical[0].id).toBe("same");
    expect(result.conflicted).toHaveLength(0);
  });

  it("detects conflicted when server is newer than local", () => {
    const local: Item = { id: "c1", updatedAt: d1 };
    const server: Item = { id: "c1", updatedAt: d2 };
    const result = computeDiff<Item>([local], [server]);
    expect(result.conflicted).toHaveLength(1);
    expect(result.conflicted[0].local.updatedAt).toEqual(d1);
    expect(result.conflicted[0].server.updatedAt).toEqual(d2);
    expect(result.identical).toHaveLength(0);
  });

  it("detects conflicted when local is newer than server", () => {
    const local: Item = { id: "c1", updatedAt: d2 };
    const server: Item = { id: "c1", updatedAt: d1 };
    const result = computeDiff<Item>([local], [server]);
    expect(result.conflicted).toHaveLength(1);
    expect(result.conflicted[0].local.updatedAt).toEqual(d2);
    expect(result.conflicted[0].server.updatedAt).toEqual(d1);
  });

  it("correctly categorises a mixed set", () => {
    const local: Item[] = [
      { id: "both-same", updatedAt: d1 },
      { id: "both-conflict", updatedAt: d1 },
      { id: "local-only", updatedAt: d1 },
    ];
    const server: Item[] = [
      { id: "both-same", updatedAt: d1 },
      { id: "both-conflict", updatedAt: d2 },
      { id: "server-only", updatedAt: d1 },
    ];
    const result = computeDiff<Item>(local, server);
    expect(result.identical.map((i) => i.id)).toEqual(["both-same"]);
    expect(result.conflicted.map((i) => i.local.id)).toEqual(["both-conflict"]);
    expect(result.localOnly.map((i) => i.id)).toEqual(["local-only"]);
    expect(result.serverOnly.map((i) => i.id)).toEqual(["server-only"]);
  });
});
