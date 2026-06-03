import { PARSE_HISTORY_STATUS, type ParseHistoryEntry } from "@/lib/db/schema";
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
