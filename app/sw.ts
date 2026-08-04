import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import {
  CacheableResponsePlugin,
  CacheFirst,
  ExpirationPlugin,
  NetworkFirst,
  NetworkOnly,
  Serwist,
} from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const IMAGEKIT_URL = process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT ?? "";

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
          // Recipe images are served straight from ImageKit (bypassing
          // /_next/image), and each ?tr= size variant is a distinct, immutable
          // URL (uploads are unique-named), so cache on the full URL — keeping
          // sizes as separate entries. Allow opaque (status 0) cross-origin
          // responses so the CDN images actually get stored.
          new CacheableResponsePlugin({ statuses: [0, 200] }),
          new ExpirationPlugin({
            maxEntries: 400,
            maxAgeSeconds: 30 * 24 * 60 * 60,
          }),
        ],
      }),
    },
    {
      // Never serve an API response from cache. Dexie is this app's offline
      // store — the API exists only to reconcile against the *current* server
      // state, so a stale hit is worse than a failed request. @serwist/next's
      // default rule set caches /api/* NetworkFirst, which meant a flaky
      // connection could feed /api/recipes/sync a stale server snapshot and
      // have the server-wins reconcile act on it.
      matcher: ({ sameOrigin, url: { pathname } }) =>
        sameOrigin && pathname.startsWith("/api/"),
      handler: new NetworkOnly(),
    },
    {
      // Page loads. @serwist/next's default HTML rule matches on the request's
      // *Content-Type* header, which navigation requests don't send, so real
      // page loads fell through to its generic `others` handler — a NetworkFirst
      // with no timeout, i.e. a launch on a bad connection sat waiting for the
      // network with a perfectly good cached copy on disk.
      //
      // NetworkFirst with a short timeout rather than StaleWhileRevalidate on
      // purpose: SWR would paint instantly but could serve HTML from a previous
      // deploy that references JS chunks the new build no longer has.
      matcher: ({ request, sameOrigin, url: { pathname } }) =>
        sameOrigin &&
        request.mode === "navigate" &&
        !pathname.startsWith("/api/"),
      handler: new NetworkFirst({
        cacheName: "pages",
        networkTimeoutSeconds: 3,
        plugins: [
          new CacheableResponsePlugin({ statuses: [200] }),
          new ExpirationPlugin({
            maxEntries: 64,
            maxAgeSeconds: 7 * 24 * 60 * 60,
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
      // Focus any already-open app window (the installed PWA) and navigate it
      // to the target. The old exact-URL match (client.url === targetUrl)
      // almost never held — the PWA sits at e.g. /en/recipes while the target
      // is a recipe URL — so it fell through to openWindow, which on iOS/Android
      // opens the default browser instead of the standalone PWA.
      for (const client of allClients) {
        if ("focus" in client) {
          if ("navigate" in client && client.url !== targetUrl) {
            await client.navigate(targetUrl).catch(() => {});
          }
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })(),
  );
});
