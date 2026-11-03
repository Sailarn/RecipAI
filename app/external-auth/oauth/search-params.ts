export type PageSearchParams = Record<string, string | string[] | undefined>;

/** First value of a search param (Next passes repeated keys as arrays). */
export function firstParam(
  params: PageSearchParams,
  key: string,
): string | undefined {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

/** Rebuild a query string from page search params, keeping repeated keys. */
export function toQueryString(params: PageSearchParams): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue;
    for (const item of Array.isArray(value) ? value : [value]) {
      query.append(key, item);
    }
  }
  return query.toString();
}
