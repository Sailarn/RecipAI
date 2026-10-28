// Typed readers over the untyped JSON an Apify actor returns. Every actor
// names the same thing differently, so each reader takes a list of candidate
// keys and returns the first usable value.

export type ApifyItem = Record<string, unknown>;

export function isRecord(value: unknown): value is ApifyItem {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function getString(item: ApifyItem, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = item[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

export function getNestedString(
  item: ApifyItem,
  firstKey: string,
  secondKey: string,
): string | undefined {
  const nested = item[firstKey];
  if (!isRecord(nested)) return undefined;

  const value = nested[secondKey];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function getNumber(item: ApifyItem, keys: string[]): number | undefined {
  for (const key of keys) {
    const value = item[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return undefined;
}

export function getNestedNumber(
  item: ApifyItem,
  firstKey: string,
  secondKey: string,
): number | undefined {
  const nested = item[firstKey];
  return isRecord(nested) ? getNumber(nested, [secondKey]) : undefined;
}

export function addUnique(values: string[], value: string | undefined) {
  if (value && !values.includes(value)) values.push(value);
}

export function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter(
      (entry): entry is string =>
        typeof entry === "string" && entry.trim() !== "",
    )
    .map((entry) => entry.trim());
}

export function collectTextFromArray(value: unknown): string | undefined {
  if (!Array.isArray(value)) return undefined;

  const lines = value
    .map((entry) => {
      if (typeof entry === "string") return entry;
      if (!isRecord(entry)) return "";
      return getString(entry, ["text", "content", "caption"]) ?? "";
    })
    .filter(Boolean);

  return lines.length ? lines.join("\n") : undefined;
}
