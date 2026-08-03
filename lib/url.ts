/**
 * True for a string the import flow can hand to the parser: an absolute
 * http(s) URL. Deliberately permissive about the host — the app parses any web
 * page, not just the recognized recipe sites and social sources, so the only
 * question is whether this is a link at all.
 */
export function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

/**
 * The first http(s) link inside a block of text, or `null`. Clipboards rarely
 * hold a bare URL — a copied share sheet usually carries a title, a newline and
 * then the link — so a plain `isValidUrl` check on the whole payload would
 * reject perfectly good pastes.
 */
export function extractFirstUrl(text: string): string | null {
  const match = text.match(/https?:\/\/[^\s<>"']+/);
  if (!match) return null;
  const trimmed = match[0].replace(/[.,;:!?)\]}]+$/, "");
  return isValidUrl(trimmed) ? trimmed : null;
}
