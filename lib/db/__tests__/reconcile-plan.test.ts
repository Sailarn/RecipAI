import { describe, expect, it } from "vitest";
import { planReconcile, type ReconcileItem } from "../reconcile-plan";

const NOW = new Date("2024-06-01T00:00:00.000Z").getTime();
const GRACE = 90_000;

interface TestItem extends ReconcileItem {
  title: string;
}

function makeItem(
  id: string,
  updatedAt: string,
  extra: Partial<TestItem> = {},
): TestItem {
  return {
    id,
    title: id,
    updatedAt: new Date(updatedAt),
    ...extra,
  };
}

function plan(local: TestItem[], server: TestItem[]) {
  return planReconcile(local, server, { now: NOW, graceWindowMs: GRACE });
}

describe("planReconcile", () => {
  describe("server-only items", () => {
    it("pulls a server-only item to the device", () => {
      const server = [makeItem("srv-1", "2024-01-01T00:00:00.000Z")];

      const result = plan([], server);

      expect(result.applyFromServer).toEqual(server);
      expect(result.pushToServer).toEqual([]);
      expect(result.deleteLocalIds).toEqual([]);
    });
  });

  describe("items on both server and device", () => {
    it("applies the server copy when updatedAt differs (server wins)", () => {
      const local = [makeItem("shared", "2024-01-01T00:00:00.000Z")];
      const server = [makeItem("shared", "2024-02-01T00:00:00.000Z")];

      const result = plan(local, server);

      expect(result.applyFromServer).toEqual(server);
      expect(result.deleteLocalIds).toEqual([]);
      expect(result.pushToServer).toEqual([]);
    });

    it("does not rewrite an identical item that already carries the marker", () => {
      const local = [
        makeItem("same", "2024-01-01T00:00:00.000Z", {
          syncedAt: new Date("2024-01-01T00:00:00.000Z"),
        }),
      ];
      const server = [makeItem("same", "2024-01-01T00:00:00.000Z")];

      const result = plan(local, server);

      expect(result.applyFromServer).toEqual([]);
      expect(result.deleteLocalIds).toEqual([]);
      expect(result.pushToServer).toEqual([]);
    });

    it("applies the server copy of an identical but unmarked item to set the marker", () => {
      const local = [makeItem("legacy", "2024-01-01T00:00:00.000Z")];
      const server = [makeItem("legacy", "2024-01-01T00:00:00.000Z")];

      const result = plan(local, server);

      expect(result.applyFromServer).toEqual(server);
    });

    it("does not clobber a local edit made within the grace window", () => {
      const recent = new Date(NOW - 10_000).toISOString();
      const local = [
        makeItem("fresh", recent, { syncedAt: new Date("2024-01-01") }),
      ];
      const server = [makeItem("fresh", "2024-02-01T00:00:00.000Z")];

      const result = plan(local, server);

      expect(result.applyFromServer).toEqual([]);
      expect(result.deleteLocalIds).toEqual([]);
      expect(result.pushToServer).toEqual([]);
    });

    it("applies the server copy for a local edit older than the grace window", () => {
      const old = new Date(NOW - GRACE - 1).toISOString();
      const local = [
        makeItem("stale", old, { syncedAt: new Date("2024-01-01") }),
      ];
      const server = [makeItem("stale", "2024-02-01T00:00:00.000Z")];

      const result = plan(local, server);

      expect(result.applyFromServer).toEqual(server);
    });
  });

  describe("device-only items", () => {
    it("pushes a never-synced device-only item to the server", () => {
      const local = [makeItem("new-1", "2024-01-01T00:00:00.000Z")];

      const result = plan(local, []);

      expect(result.pushToServer).toEqual(local);
      expect(result.deleteLocalIds).toEqual([]);
      expect(result.applyFromServer).toEqual([]);
    });

    it("deletes a previously-synced device-only item (server removed it)", () => {
      const local = [
        makeItem("gone-1", "2024-01-01T00:00:00.000Z", {
          syncedAt: new Date("2024-01-01T00:00:00.000Z"),
        }),
      ];

      const result = plan(local, []);

      expect(result.deleteLocalIds).toEqual(["gone-1"]);
      expect(result.pushToServer).toEqual([]);
      expect(result.applyFromServer).toEqual([]);
    });
  });

  describe("mixed set", () => {
    it("routes each item to the correct bucket", () => {
      const local = [
        makeItem("both-diff", "2024-01-01T00:00:00.000Z", {
          syncedAt: new Date("2024-01-01"),
        }),
        makeItem("new-local", "2024-05-01T00:00:00.000Z"),
        makeItem("deleted-on-server", "2024-01-01T00:00:00.000Z", {
          syncedAt: new Date("2024-01-01"),
        }),
      ];
      const server = [
        makeItem("both-diff", "2024-03-01T00:00:00.000Z"),
        makeItem("server-new", "2024-04-01T00:00:00.000Z"),
      ];

      const result = plan(local, server);

      expect(result.applyFromServer.map((item) => item.id).sort()).toEqual([
        "both-diff",
        "server-new",
      ]);
      expect(result.pushToServer.map((item) => item.id)).toEqual(["new-local"]);
      expect(result.deleteLocalIds).toEqual(["deleted-on-server"]);
    });
  });
});
