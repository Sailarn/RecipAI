/** Full-page navigation (leaves the SPA). Isolated so tests can observe it. */
export function navigateTo(url: string): void {
  window.location.assign(url);
}
