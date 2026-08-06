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

// Keyed by build so a deploy orphans the previous deploy's documents outright.
// Without this the page cache is keyed by URL alone and survives deploys, which
// is how a recipe-detail document from an older build got paired with chunk
// hashes that build no longer serves.
//
// The `app-` prefix keeps this clear of `defaultCache`, which owns "pages",
// "pages-rsc" and "pages-rsc-prefetch" — a bare `pages-` prefix would make the
// cleanup below delete Serwist's own RSC caches on every activation.
const PAGES_CACHE_PREFIX = "app-pages-";
const PAGES_CACHE = `${PAGES_CACHE_PREFIX}${process.env.NEXT_PUBLIC_BUILD_ID ?? "dev"}`;

// The build-agnostic cache this rule used to write to. Existing installs still
// carry one, full of documents from whichever build they last cached — the
// exact thing this change exists to stop serving. Nothing reads it any more, so
// deleting it is what actually un-poisons a device already in the bad state.
const LEGACY_PAGES_CACHE = "pages";

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
      // Only the six app shells per locale are precached; everything else —
      // recipe detail above all, which is what a share link points at — is
      // served from here. The cache name carries the build id, so a stale hit
      // can only ever return a document from the *current* build. It used to be
      // the bare string "pages": runtime caches (unlike the precache) are not
      // cleared on activation, so that cache kept documents for up to its
      // 7-day maxAge and served them whenever the network missed the timeout,
      // pairing an old document with chunk hashes the new build had dropped.
      // A slow device hit that on essentially every launch.
      matcher: ({ request, sameOrigin, url: { pathname } }) =>
        sameOrigin &&
        request.mode === "navigate" &&
        !pathname.startsWith("/api/"),
      handler: new NetworkFirst({
        cacheName: PAGES_CACHE,
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

// Serwist cleans up its own precache across versions but leaves runtime caches
// alone, so every past build's page cache would otherwise sit in storage
// forever. Drop them all except this build's, plus the legacy unversioned one.
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      const stale = names.filter(
        (name) =>
          name === LEGACY_PAGES_CACHE ||
          (name.startsWith(PAGES_CACHE_PREFIX) && name !== PAGES_CACHE),
      );
      await Promise.all(stale.map((name) => caches.delete(name)));
    })(),
  );
});

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
