// Two independent pollers can observe the same parse job reach a terminal
// state: the inline parse page (`use-url-parse`, which resumes a job on reload)
// and the global watcher (`use-parse-job-watcher`, which catches completions
// after you navigate away). Without coordination both run their completion side
// effects for the same job — duplicate parse-history rows, telemetry events,
// toasts and `parsedRecipes` entries.
//
// This guard lets exactly one of them win: the first caller for a given job id
// gets `true` and runs the side effects; any later caller gets `false` and
// bails. The check-and-set is synchronous, so it is race-free on JS's single
// thread regardless of which poller resolves its fetch first.

const handledJobIds = new Set<string>();

/**
 * Claim the right to run completion side effects for a job. Returns `true` for
 * the first caller per job id, `false` for every caller after that.
 */
export function claimJobCompletion(jobId: string): boolean {
  if (handledJobIds.has(jobId)) return false;
  handledJobIds.add(jobId);
  return true;
}
