const JOB_KEY = "parseJobIds";

export function getJobIds(): string[] {
  // migrate old single key format
  const old = localStorage.getItem("parseJobId");
  if (old) {
    localStorage.removeItem("parseJobId");
    localStorage.setItem(JOB_KEY, JSON.stringify([old]));
    return [old];
  }
  try {
    return JSON.parse(localStorage.getItem(JOB_KEY) || "[]");
  } catch {
    return [];
  }
}

export function addJobId(id: string) {
  const ids = getJobIds();
  if (!ids.includes(id)) {
    localStorage.setItem(JOB_KEY, JSON.stringify([...ids, id]));
  }
}

export function removeJobId(id: string) {
  const ids = getJobIds().filter((j) => j !== id);
  localStorage.setItem(JOB_KEY, JSON.stringify(ids));
}
