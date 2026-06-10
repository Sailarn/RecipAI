import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { CacheFirst, ExpirationPlugin, Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const IMAGEKIT_URL = process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT ?? "";

// Strip ImageKit transform query params (?tr=...) from the cache key so all
// size variants of the same image (list thumbnail vs detail hero) share one
// cache entry. Without this, list page caches ?tr=w-400 and detail page
// requests ?tr=w-800 — a cache miss that fails offline.
const imagekitCacheKeyPlugin = {
  cacheKeyWillBeUsed: async ({ request }: { request: Request }) => {
    const url = new URL(request.url);
    url.search = "";
    return new Request(url.toString(), { headers: request.headers });
  },
};

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    {
      matcher: ({ url }) =>
        IMAGEKIT_URL !== "" && url.href.startsWith(IMAGEKIT_URL),
      handler: new CacheFirst({
        cacheName: "recipe-images",
        plugins: [
          imagekitCacheKeyPlugin,
          new ExpirationPlugin({
            maxEntries: 100,
            maxAgeSeconds: 30 * 24 * 60 * 60,
          }),
        ],
      }),
    },
    ...defaultCache,
  ],
  fallbacks: {
    entries: [
      {
        url: "/~offline",
        matcher({ request }) {
          return request.destination === "document";
        },
      },
    ],
  },
});

serwist.addEventListeners();

self.addEventListener("push", (event: PushEvent) => {
  let data: { title?: string; body?: string; url?: string } = {};
  try {
    data = event.data?.json() ?? {};
  } catch {
    data = { title: "RecipAI", body: event.data?.text() ?? "" };
  }
  event.waitUntil(
    self.registration.showNotification(data.title ?? "RecipAI", {
      body: data.body ?? "",
      icon: "/icon-192x192.png",
      badge: "/icon-192x192.png",
      tag: "recipe-parse",
      data: { url: data.url ?? "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event: NotificationEvent) => {
  event.notification.close();
  const targetUrl: string = event.notification.data?.url ?? "/";
  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      for (const client of allClients) {
        if (client.url === targetUrl && "focus" in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })(),
  );
});
