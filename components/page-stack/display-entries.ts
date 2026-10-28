import type { StackEntry } from "@/lib/navigation-stack";

type DisplayStatus = "stable" | "entering" | "leaving";
export type DisplayEntry = StackEntry & { status: DisplayStatus };
export type StackChange = "push" | "pop" | "reset";

export function classifyStackChange(
  prev: StackEntry[],
  curr: StackEntry[],
): StackChange {
  const keepsPrefix = (shorter: StackEntry[], longer: StackEntry[]) =>
    shorter.every((entry, index) => entry.id === longer[index].id);

  if (curr.length > prev.length && keepsPrefix(prev, curr)) return "push";
  if (curr.length < prev.length && curr.length > 0 && keepsPrefix(curr, prev))
    return "pop";
  return "reset";
}

export function stableEntries(entries: StackEntry[]): DisplayEntry[] {
  return entries.map((entry) => ({ ...entry, status: "stable" }));
}

// Entries still on the stack settle; anything the stack dropped keeps (or
// starts) sliding out. Marking only the last displayed entry instead left a
// page stranded on screen after two quick pops, or a pop followed by a push
// while the first page was still sliding out.
function settle(current: DisplayEntry[], curr: StackEntry[]): DisplayEntry[] {
  const onStack = new Set(curr.map((entry) => entry.id));
  return current.map((entry) => ({
    ...entry,
    status: onStack.has(entry.id) ? "stable" : "leaving",
  }));
}

export function withPushed(
  current: DisplayEntry[],
  curr: StackEntry[],
): DisplayEntry[] {
  const incoming = curr[curr.length - 1];
  return [...settle(current, curr), { ...incoming, status: "entering" }];
}

export function withPopped(
  current: DisplayEntry[],
  curr: StackEntry[],
): DisplayEntry[] {
  return settle(current, curr);
}

/** The last entry that isn't sliding out — visible beneath any leaving page. */
export function topIndex(display: DisplayEntry[]): number {
  return display.reduce(
    (topAccumulator, entry, index) =>
      entry.status !== "leaving" ? index : topAccumulator,
    -1,
  );
}
