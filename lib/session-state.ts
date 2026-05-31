/**
 * Module-level session flag for use outside React components.
 * Updated by useSyncOnLogin whenever the auth session changes.
 */
let _isSignedIn = false;

export function setIsSignedIn(value: boolean): void {
  _isSignedIn = value;
}

export function isSignedIn(): boolean {
  return _isSignedIn;
}
