// Persists the embed-model download lifecycle across app launches so a download
// interrupted by closing the app (which kills the worker and loses in-memory
// progress) can be detected and resumed on relaunch. Only the lifecycle is
// persisted — never the live percentage — so a reload still starts visually
// clean rather than showing a stale "downloading 47%".

const STARTED_KEY = "embedDownloadStarted";
const READY_KEY = "embedModelReady";

function hasStorage(): boolean {
  return typeof window !== "undefined" && "localStorage" in window;
}

/** Mark that a model download has begun (no-op once the model is ready). */
export function markEmbedDownloadStarted(): void {
  if (!hasStorage() || isEmbedModelReady()) return;
  localStorage.setItem(STARTED_KEY, "1");
}

/** Mark the model fully downloaded and ready; clears the in-progress marker. */
export function markEmbedModelReady(): void {
  if (!hasStorage()) return;
  localStorage.setItem(READY_KEY, "1");
  localStorage.removeItem(STARTED_KEY);
}

export function isEmbedModelReady(): boolean {
  return hasStorage() && localStorage.getItem(READY_KEY) === "1";
}

/** A download began but never reported "ready" — i.e. it was interrupted. */
export function isEmbedDownloadInterrupted(): boolean {
  return (
    hasStorage() &&
    localStorage.getItem(STARTED_KEY) === "1" &&
    localStorage.getItem(READY_KEY) !== "1"
  );
}
