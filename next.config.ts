import { withSentryConfig } from "@sentry/nextjs";
import withSerwistInit from "@serwist/next";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import packageJson from "./package.json";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  disable: false,
  reloadOnOnline: false,
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
