import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@serwist/next/worker", () => ({ defaultCache: [] }));

const addEventListeners = vi.fn();
const serwistConstructor = vi.fn();

vi.mock("serwist", () => {
  class MockPlugin {
    options: unknown;
    constructor(options: unknown) {
      this.options = options;
    }
  }
  class MockStrategy {
    options: { cacheName?: string };
    constructor(options: { cacheName?: string }) {
      this.options = options;
    }
  }
  return {
    Serwist: class {
      constructor(options: unknown) {
        serwistConstructor(options);
      }
      addEventListeners = addEventListeners;
    },
    CacheableResponsePlugin: MockPlugin,
    ExpirationPlugin: MockPlugin,
    CacheFirst: MockStrategy,
    NetworkFirst: MockStrategy,
    NetworkOnly: MockStrategy,
  };
});

type ActivateHandler = (event: {
  waitUntil: (work: Promise<unknown>) => void;
}) => void;

// NetworkOnly is constructed with no arguments, so not every route carries
// options — hence the optional chaining rather than a direct property read.
type RuntimeCaching = {
  handler?: { options?: { cacheName?: string } };
}[];

function pagesCacheName(config: { runtimeCaching: RuntimeCaching }) {
  return config.runtimeCaching
    .map((route) => route.handler?.options?.cacheName)
    .find((name) => name?.startsWith("app-pages-"));
}

function serwistOptions() {
  return serwistConstructor.mock.calls[0]?.[0] as {
    runtimeCaching: RuntimeCaching;
  };
}

const listeners = new Map<string, ActivateHandler>();
const deleted: string[] = [];
let cacheNames: string[] = [];

async function loadServiceWorker(buildId: string) {
  vi.stubEnv("NEXT_PUBLIC_BUILD_ID", buildId);
  listeners.clear();
  deleted.length = 0;

  vi.stubGlobal("self", {
    addEventListener: (type: string, handler: ActivateHandler) => {
      listeners.set(type, handler);
    },
    registration: { showNotification: vi.fn() },
    clients: { matchAll: vi.fn(), openWindow: vi.fn() },
    __SW_MANIFEST: [],
  });
  vi.stubGlobal("caches", {
    keys: () => Promise.resolve(cacheNames),
    delete: (name: string) => {
      deleted.push(name);
      return Promise.resolve(true);
    },
  });

  vi.resetModules();
  await import("../sw");
}

async function runActivate() {
  const handler = listeners.get("activate");
  if (!handler) throw new Error("no activate listener registered");
  const pending: Promise<unknown>[] = [];
  handler({ waitUntil: (work) => pending.push(work) });
  await Promise.all(pending);
}

describe("service worker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  describe("page cache naming", () => {
    it("keys the navigation cache by build id", async () => {
      await loadServiceWorker("abc123");

      expect(pagesCacheName(serwistOptions())).toBe("app-pages-abc123");
    });

    it("gives a different build a different cache", async () => {
      await loadServiceWorker("build-one");
      const first = pagesCacheName(serwistOptions());

      serwistConstructor.mockClear();
      await loadServiceWorker("build-two");
      const second = pagesCacheName(serwistOptions());

      expect(first).not.toBe(second);
    });
  });

  describe("activation cleanup", () => {
    it("deletes page caches from previous builds", async () => {
      cacheNames = ["app-pages-old", "app-pages-current"];
      await loadServiceWorker("current");

      await runActivate();

      expect(deleted).toEqual(["app-pages-old"]);
    });

    it("deletes the legacy unversioned page cache", async () => {
      cacheNames = ["pages", "app-pages-current"];
      await loadServiceWorker("current");

      await runActivate();

      expect(deleted).toEqual(["pages"]);
    });

    it("leaves Serwist's own RSC caches alone", async () => {
      cacheNames = ["pages-rsc", "pages-rsc-prefetch", "app-pages-current"];
      await loadServiceWorker("current");

      await runActivate();

      expect(deleted).toEqual([]);
    });

    it("leaves unrelated caches alone", async () => {
      cacheNames = ["recipe-images", "apis", "static-js-assets"];
      await loadServiceWorker("current");

      await runActivate();

      expect(deleted).toEqual([]);
    });
  });
});
