const CONSENT_KEY = "embedModelConsent";

export function hasEmbedConsent(): boolean {
  try {
    return localStorage.getItem(CONSENT_KEY) === "granted";
  } catch {
    return false;
  }
}

export function grantEmbedConsent(): void {
  try {
    localStorage.setItem(CONSENT_KEY, "granted");
  } catch {}
}
