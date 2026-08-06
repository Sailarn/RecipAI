/**
 * Identifies the build this bundle was compiled from.
 *
 * Resolved in `next.config.ts` (`resolveBuildId`) from the Vercel commit SHA,
 * then git, then the package version, and inlined here at build time. The
 * service worker keys its page cache by the same value, so a document and the
 * chunks it references always agree about which build they belong to.
 *
 * Read through a function rather than a module-level constant so tests can
 * stub the environment without resetting modules.
 */
export function getBuildId(): string {
  // `||`, not `??`: an env var defined as an empty string is absent for our
  // purposes, and reporting "" as a build id would silently group every such
  // deploy together.
  return process.env.NEXT_PUBLIC_BUILD_ID || "unknown";
}
