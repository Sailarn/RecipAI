import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { withSentryConfig } from "@sentry/nextjs";
import withSerwistInit from "@serwist/next";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { locales } from "./i18n/config";
import { routes } from "./lib/routes";
import packageJson from "./package.json";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const PUBLIC_DIR = path.join(process.cwd(), "public");
// The service worker and its map are build output, not app assets.
const NOT_PRECACHED = new Set(["sw.js", "sw.js.map"]);

/**
 * Everything under `public/`, content-hashed.
 *
 * @serwist/next normally globs this itself, but only when
 * `additionalPrecacheEntries` is unset — passing entries *replaces* the scan
 * rather than extending it. Dropping it would un-precache `pwa-launch.html`,
 * which is the installed PWA's start_url, so we reproduce it here.
 */
function publicPrecacheEntries(
  directory = PUBLIC_DIR,
  prefix = "",
): { url: string; revision: string }[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const relativePath = `${prefix}${entry.name}`;
    if (entry.isDirectory()) {
      return publicPrecacheEntries(
        path.join(directory, entry.name),
        `${relativePath}/`,
      );
    }
    if (NOT_PRECACHED.has(relativePath)) return [];
    const contents = readFileSync(path.join(directory, entry.name));
    return [
      {
        url: `/${relativePath}`,
        revision: createHash("sha256").update(contents).digest("hex"),
      },
    ];
  });
}

// Every JS/CSS/font asset is precached, but the page shells were not — so a
// first offline launch of a tab the user hadn't visited yet fell through to
// /~offline, and every launch re-fetched HTML it already had. These are the
// prerendered (SSG) destinations reachable from the bottom nav.
//
// The revision changes on every build, so a deploy re-fetches all of them at
// service-worker install and the whole app version flips over atomically on
// activation — no chance of stale HTML pointing at chunks that no longer exist.
const SHELL_REVISION = `${packageJson.version}-${Date.now()}`;

const appShellEntries = locales.flatMap((locale) =>
  [
    routes.recipes.list(locale),
    routes.recipes.parse(locale),
    routes.pantry(locale),
    routes.profile(locale),
    routes.parseHistory(locale),
    routes.login(locale),
  ].map((url) => ({ url, revision: SHELL_REVISION })),
);

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  // Off in dev, where a service worker mostly serves yesterday's build back to
  // you. Set SW_DEV=1 to turn it on for local PWA/offline work (`bun run
  // tunnel` + an installed app).
  disable: process.env.NODE_ENV === "development" && process.env.SW_DEV !== "1",
  reloadOnOnline: false,
  additionalPrecacheEntries: [...publicPrecacheEntries(), ...appShellEntries],
});

const nextConfig: NextConfig = {
  allowedDevOrigins:
    process.env.DEV_ORIGINS?.split(",").map((origin) => origin.trim()) ?? [],
  skipTrailingSlashRedirect: true,
  // The telemetry facade (`lib/telemetry`) is imported by client components but
  // dynamically imports `posthog-server` only when running on the server. That
  // server branch never executes in the browser, yet webpack still compiles its
  // chunk for the client bundle — and posthog-node pulls node-only modules
  // (`node:readline`), which the browser target can't resolve. Alias it to an
  // empty module on the client build so the dead branch compiles cleanly.
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        "posthog-node": false,
      };
    }
    return config;
  },
  env: {
    NEXT_PUBLIC_APP_VERSION: packageJson.version,
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "ik.imagekit.io" },
      { protocol: "https", hostname: "images.silpo.ua" },
      { protocol: "https", hostname: "image-resizer.silpo.ua" },
      { protocol: "https", hostname: "staticv2.silpo.ua" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      {
        protocol: "https",
        hostname: "*.cdninstagram.com",
      },
      {
        protocol: "https",
        hostname: "*.fbcdn.net",
      },
      {
        protocol: "https",
        hostname: "klopotenko.com",
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: "/ingest/static/:path*",
        destination: "https://eu-assets.i.posthog.com/static/:path*",
      },
      {
        source: "/ingest/:path*",
        destination: "https://eu.i.posthog.com/:path*",
      },
    ];
  },
};

export default withSentryConfig(withSerwist(withNextIntl(nextConfig)), {
  org: "sailarn",
  project: "recipai-app",
  silent: !process.env.CI,
  widenClientFileUpload: true,
  // Sentry dominates the boot bundle (139 KB gz of 204 KB), so treeshake what
  // this app doesn't use. Performance tracing is the only real lever — Replay
  // is already absent from the bundle — and it's worth 48 KB gz on every cold
  // start. We use Sentry purely for error/issue reporting; web vitals come
  // from Vercel Speed Insights. Accordingly, tracesSampleRate is no longer set
  // in any of the three Sentry configs.
  // excludeReplayWorker is deliberately NOT set: it is only safe when a
  // compression worker is self-hosted, which we don't do.
  bundleSizeOptimizations: {
    excludeDebugStatements: true,
    excludeReplayShadowDom: true,
    excludeReplayIframe: true,
    excludeTracing: true,
  },
  sourcemaps: {
    disable: false,
  },
  webpack: {
    automaticVercelMonitors: true,
    treeshake: { removeDebugLogging: true },
  },
});
