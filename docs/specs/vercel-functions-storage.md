# Vercel Functions Storage investigation

Investigated on 2026-11-04/05 because the team's **Functions Storage** chart on Vercel reached about 7.7 GB and then about 11 GB, close to the Hobby limit. All the storage belongs to the `recip-ai` project. The two other projects in the team use 0 B.

## Summary

- Functions Storage is the total size of the function bundles of **every deployment Vercel keeps**, not just the live one.
- Each `recip-ai` deployment is about **0.7 GB**. Storage grew because releases were frequent: 8 production deployments between Oct 25 and Nov 3, and 3 more in about 90 minutes on Nov 4–5. Nothing was removing deployments quickly enough.
- Deleting old deployments is the immediate fix. The chart may still not drop straight away, because Vercel keeps deleted deployments recoverable for 30 days.
- The lasting fixes are to keep fewer deployments, automatically, and to make each one smaller.

## What Functions Storage is

A Vercel deployment of a Next.js app is split into Vercel Functions. A function is a zipped bundle of server code: API routes, server-rendered pages and middleware, plus every `node_modules` file those routes need at runtime. Next.js decides what goes in with output file tracing, which writes the `.nft.json` files next to each route in `.next/server/app`.

Vercel stores these bundles for **every deployment that still exists**, so that any of them can be served or promoted again. The Functions Storage chart is the sum over all kept deployments.

A deployment can't run without its bundles, so this storage is genuinely needed. But only two deployments are useful:

- the live production deployment, and
- the previous one, as a rollback target. On Hobby, `vercel rollback` can only go back to the previous production deployment anyway.

Every older deployment uses storage and gives nothing back.

## Evidence

### The chart steps match deployments

Deployments are made by `.github/workflows/release.yml` (`vercel build --prod` followed by `vercel deploy --prebuilt --prod`). Every release is a production deployment. Git deployments are disabled in `vercel.json`.

| Date (UTC) | Chart change | Cause |
|---|---|---|
| Oct 6 | 0 → ~3.1 GB | start of the 30-day window: the deployments that already existed (about 4 to 5) |
| Oct 15 | ~3.1 → ~2.6 GB | an old deployment removed by the retention policy |
| Oct 17 | ~2.6 → ~2.0 GB | an old deployment removed by the retention policy |
| Oct 25 | ~2.0 → ~3.4 GB | v2.29.0 and v2.29.1 |
| Oct 28–29 | ~3.4 → ~5.5 GB | v2.30.0, v2.30.1 and v2.30.2 |
| Nov 3 | ~5.5 → ~7.7 GB | v2.31.0, v2.32.0 and v2.32.1 |

On Nov 4 the project kept 11 production deployments, from v2.28.3 (Aug 25) to v2.32.1 (Nov 3). 11 × ~0.7 GB ≈ 7.7 GB, which matches the chart.

### The state on Nov 5, ~01:00 UTC

- The 11 deployments above were deleted. Looking up v2.32.1 (`dpl_AUvbFVh4HbN2eqCyJ4Vq8fptJj5L`) now returns 404.
- 3 deployments exist: v2.33.2 (Nov 4, 23:33), v2.33.3 (Nov 5, 00:00) and v2.34.0 (Nov 5, 00:20, live).
- The dashboard still showed **~11 GB**. That is about 14 deployments × ~0.75 GB, meaning the 11 deleted deployments **plus** the 3 new ones. The new deployments were added, but the deleted ones haven't been taken off yet.

### Why deleted deployments may still count

Vercel's docs say a deleted deployment is only *marked* for deletion. It can be restored for **30 days** and is permanently removed after that (the `deployment.cleanup` webhook fires only then). The docs don't say whether Functions Storage counts a deployment during that window. There are two explanations:

1. **It counts during the 30-day recovery window.** Then the number falls about 30 days after the deletion, in early December.
2. **The usage figure lags.** Then it falls within a day or so.

To tell them apart, check the chart again about a day after the deletion. If it's still ~11 GB, it's (1), and only Vercel support can purge the deployments sooner. Ask them to permanently remove the deleted deployments of `recip-ai` because you're near the Hobby limit.

The Vercel MCP connector can't read the Functions Storage metric itself (the billing endpoint returns `costs_not_found` for this Hobby team). The numbers above come from the dashboard screenshot and the deployment list.

### Why one deployment is ~0.7 GB

I measured this with a local `next build --webpack` at commit `0c63800` (v2.32.1 plus docs). I added up every file listed in every route's `.nft.json`. This is uncompressed, and shared files count once per route that uses them, which is roughly how they end up in function bundles.

- 53 traced routes, **~1,500 MB in total** (163 MB of unique files). The ~0.7 GB Vercel shows per deployment is consistent with this zipped.
- The three embedding routes are 5× bigger than the rest:

| Route | Traced size |
|---|---|
| `/api/ingredients/enrich` | 138 MB |
| `/api/ingredients/embed-match` | 137 MB |
| `/api/embed` | 131 MB |
| a typical page or API route | 24–31 MB |

The biggest dependencies, summed across all routes:

| Package | MB | Notes |
|---|---|---|
| `onnxruntime-node` | 218 | Native ONNX runtime, pulled in by `@huggingface/transformers` in `lib/embed/local-provider.ts`. Its dynamic `import()` in `lib/embed/index.ts` keeps it out of module loading, but **not** out of file tracing. It ships `linux/x64` (46 MB), `linux/arm64` (25 MB), `win32` and `darwin` binaries. Vercel only needs `linux/x64`. |
| `@sentry/server-runtime-injection` | 207 | About 4 MB in each of the 53 routes. **151 MB** of the Sentry total is `.map` source-map files that are never needed at runtime. |
| `next` | 77 | Framework runtime. Needed. |
| `@img/sharp-libvips-linuxmusl-x64` | 57 | The Alpine (musl) build of sharp. Not needed on Vercel. |
| `@img/sharp-libvips-linux-x64` | 56 | The glibc build of sharp. Needed. |
| `@sentry/core`, `@sentry/conventions` | 104 | Sentry server SDK. |
| `@huggingface/transformers` | 8 | |

`@huggingface/transformers` has been a dependency since v2.16.1 (2026-07-19), so it didn't cause this month's growth. It is the main reason each deployment is so heavy.

### Is the `local` embedding provider used on Vercel?

Unresolved, and it decides whether onnxruntime can be dropped entirely.

- `EMBED_PROVIDERS` on Vercel (preview and production) is a **Sensitive** variable, so its value can't be read through the API or `vercel pull`.
- `docs/explanation/ingredient-vocabulary.md` and `docs/reference/env.md` say `local` was the Raspberry Pi's provider, and the Pi has been abandoned. `instrumentation.ts` says pre-warming is a "no-op on Vercel (the http provider has no local model)".
- `/api/embed` exists only to serve **other** hosts' `http:` providers, using `embedLocalOnly`.
- There were no runtime errors on the three embedding routes in the last 7 days. Hobby keeps runtime logs for only 1 hour, so actual use couldn't be checked.

If Vercel's `EMBED_PROVIDERS` doesn't contain `local`, onnxruntime and `@huggingface/transformers` are dead weight in every deployment.

## How to lower it

### 1. Delete old deployments (done on Nov 4–5)

Keep the live deployment and the previous one. Delete the rest in the Deployments tab or with `vercel remove <url>`. As described above, the chart may take up to 30 days to reflect it.

### 2. Keep only the last 2 deployments automatically

Pick one or both:

- **Retention policy.** Project Settings → Security → Deployment Retention: set production (and preview, canceled and errored) to the shortest period offered. Note that frequent releases can still pile up within that period.
- **Cleanup step in `release.yml`.** After `vercel deploy --prebuilt --prod`, list the project's production deployments and `vercel remove --yes` all but the newest two. This keeps the count at 2 however often you release.

Either way, deleted deployments may still count for up to 30 days, so this sets a ceiling but won't make the number drop instantly.

### 3. Make each deployment smaller

Add `outputFileTracingExcludes` to `next.config.ts`. Estimated savings, against the ~1,500 MB traced total:

| Exclude | Saves | Risk |
|---|---|---|
| `node_modules/@sentry/**/*.map` (or all `node_modules/**/*.map`) | ~151 MB | None. Source maps aren't loaded at runtime, and Sentry gets its maps from the build upload, not from function bundles. |
| `node_modules/@img/*linuxmusl*/**` | ~58 MB | None on Vercel, which runs glibc Linux. |
| `node_modules/onnxruntime-node/bin/napi-v6/{darwin,win32,linux/arm64}/**` | ~80 MB | None on Vercel, which runs Linux x64. |
| **or** all of `onnxruntime-node` and `@huggingface/transformers` (instead of the line above) | ~226 MB | Only safe if `local` isn't in `EMBED_PROVIDERS` on Vercel. Otherwise embeddings break and matching falls back to provisional creation. |

That's about **19% smaller** (~290 MB) with the safe excludes, or about **28% smaller** (~435 MB) if onnxruntime goes too. The rest is mostly Next.js and Sentry runtime code, which is needed.

Check the result by running `next build` and re-adding up the `.nft.json` files, then after deploying, by watching the per-deployment step on the chart.

## Open questions

- Does Vercel's `EMBED_PROVIDERS` contain `local`? Check it in Project Settings → Environment Variables (it's Sensitive, so you may have to re-enter it to know).
- Does Functions Storage count deleted deployments during the 30-day recovery window? Check the chart a day after the Nov 4–5 deletion, or ask Vercel support.
