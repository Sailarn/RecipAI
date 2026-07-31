/**
 * A parsed recipe's image lives on the origin site's CDN (TikTok, Instagram,
 * …), which signs URLs, locks them to a host, or expires them within hours. By
 * the time we mirror that image to ImageKit the fetch can legitimately come
 * back 403/404/5xx or fail outright at the network layer.
 *
 * Every caller already degrades gracefully — keep the source URL, flag the
 * upload as failed — so these are expected outcomes of parsing third-party
 * content, not defects. Reporting them drowns out genuine upload breakage
 * (ImageKit rejections, oversized files, unsupported types), which stays
 * captured.
 *
 * The check is message-based because the failure crosses an HTTP boundary: the
 * server throws, `/api/images/upload` serialises it into a 400 body, and the
 * browser rebuilds it as a fresh `Error`. No error class survives that trip.
 */

/** Thrown by the upload API when it cannot fetch the caller-supplied image URL. */
export const SOURCE_FETCH_FAILED = "Failed to fetch image from URL";

/** Thrown server-side, carrying the status and host for triage in the logs. */
export function sourceFetchFailedMessage(status: number, host: string): string {
  return `Failed to fetch image (${status}) from ${host}`;
}

// Undici surfaces DNS/TLS/connection-reset failures as a bare `TypeError:
// fetch failed`, with the real cause only on `error.cause`.
const NETWORK_FAILURE = "fetch failed";

// Narrows to Error so callers can read `.message` for the log line without a cast.
export function isSourceImageUnavailable(error: unknown): error is Error {
  if (!(error instanceof Error)) return false;
  return (
    error.message.startsWith("Failed to fetch image") ||
    error.message.includes(NETWORK_FAILURE)
  );
}
