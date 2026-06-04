import {
  PARSE_HISTORY_STATUS,
  PARSE_JOB_STATUS,
  type ParseHistoryEntry,
} from "@/lib/db/schema";
import { friendlyParseError } from "./friendly-parse-error";

// A readable heading for a failed job, which has no recipe title.
function hostLabel(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function doneParseHistoryEntry(
  id: string,
  title: string,
  url: string,
): ParseHistoryEntry {
  return {
    id,
    title,
    status: PARSE_HISTORY_STATUS.DONE,
    url,
    createdAt: new Date(),
  };
}

export function failedParseHistoryEntry(
  id: string,
  url: string,
  rawError: string,
): ParseHistoryEntry {
  return {
    id,
    title: hostLabel(url),
    status: PARSE_HISTORY_STATUS.FAILED,
    url,
    reason: friendlyParseError(rawError),
    createdAt: new Date(),
  };
}

interface ServerParseJob {
  id: string;
  url: string;
  status: string;
  result: { title?: string; sourceUrl?: string } | null;
  error: string | null;
  createdAt: string;
}

// Map a server parse_jobs row to a history entry, preserving its createdAt.
// Returns null for non-terminal jobs (pending/processing) so they're skipped.
export function parseHistoryEntryFromServerJob(
  job: ServerParseJob,
): ParseHistoryEntry | null {
  const createdAt = new Date(job.createdAt);
  if (job.status === PARSE_JOB_STATUS.DONE) {
    return {
      id: job.id,
      title: job.result?.title ?? hostLabel(job.url),
      status: PARSE_HISTORY_STATUS.DONE,
      url: job.result?.sourceUrl ?? job.url,
      createdAt,
    };
  }
  if (job.status === PARSE_JOB_STATUS.FAILED) {
    return {
      id: job.id,
      title: hostLabel(job.url),
      status: PARSE_HISTORY_STATUS.FAILED,
      url: job.url,
      reason: friendlyParseError(job.error ?? ""),
      createdAt,
    };
  }
  return null;
}
