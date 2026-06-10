const PARSE_JOB_IDS_KEY = "parseJobIds";
const UPLOAD_TOKENS_KEY = "parseUploadTokens";
const PENDING_UPLOAD_TOKEN_KEY = "pendingUploadToken";

export function getJobIds(): string[] {
  // migrate legacy single-item format
  const legacyJobId = localStorage.getItem("parseJobId");
  if (legacyJobId) {
    localStorage.removeItem("parseJobId");
    localStorage.setItem(PARSE_JOB_IDS_KEY, JSON.stringify([legacyJobId]));
    return [legacyJobId];
  }
  try {
    const parsed: unknown[] = JSON.parse(
      localStorage.getItem(PARSE_JOB_IDS_KEY) || "[]",
    );
    return parsed.filter(
      (id): id is string => typeof id === "string" && id.length > 0,
    );
  } catch {
    return [];
  }
}

export function addJobId(jobId: string, uploadToken?: string) {
  if (!jobId) return;
  const ids = getJobIds();
  if (!ids.includes(jobId)) {
    localStorage.setItem(PARSE_JOB_IDS_KEY, JSON.stringify([...ids, jobId]));
  }
  if (uploadToken) {
    const tokens = getTokenMap();
    localStorage.setItem(
      UPLOAD_TOKENS_KEY,
      JSON.stringify({ ...tokens, [jobId]: uploadToken }),
    );
  }
}

export function getUploadToken(jobId: string): string | null {
  return getTokenMap()[jobId] ?? null;
}

export function removeJobId(jobId: string) {
  const ids = getJobIds().filter((id) => id !== jobId);
  localStorage.setItem(PARSE_JOB_IDS_KEY, JSON.stringify(ids));

  const tokens = getTokenMap();
  delete tokens[jobId];
  localStorage.setItem(UPLOAD_TOKENS_KEY, JSON.stringify(tokens));
}

function getTokenMap(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(UPLOAD_TOKENS_KEY) || "{}");
  } catch {
    return {};
  }
}

/**
 * Persists the upload token independently of the job lifecycle so the recipe
 * form can access it after the job entry has been cleaned up.
 */
export function storePendingUploadToken(token: string) {
  localStorage.setItem(PENDING_UPLOAD_TOKEN_KEY, token);
}

/** Returns the pending upload token, or null if none is stored. */
export function getPendingUploadToken(): string | null {
  return localStorage.getItem(PENDING_UPLOAD_TOKEN_KEY);
}

/** Clears the pending upload token after it has been consumed. */
export function clearPendingUploadToken() {
  localStorage.removeItem(PENDING_UPLOAD_TOKEN_KEY);
}
