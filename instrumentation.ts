import * as Sentry from "@sentry/nextjs";

// Pre-warm the in-process e5-small model at boot on the Pi (local provider) so
// the first real embed doesn't pay the ~8s load — which otherwise exceeds the
// remote http timeout and degrades matching during warm-up. No-op on Vercel
// (the http provider has no local model) and in the edge runtime.
export function shouldPrewarmLocalEmbed(
  providers: string,
  runtime: string | undefined,
): boolean {
  return (
    runtime === "nodejs" &&
    providers
      .split(",")
      .map((entry) => entry.trim())
      .includes("local")
  );
}

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }

  if (
    shouldPrewarmLocalEmbed(
      process.env.EMBED_PROVIDERS ?? "",
      process.env.NEXT_RUNTIME,
    )
  ) {
    const { embedLocalOnly } = await import("@/lib/embed");
    // Fire-and-forget — never block startup; the load runs in the background.
    void embedLocalOnly([" "], "query").catch(() => {});
  }
}

export const onRequestError = Sentry.captureRequestError;
