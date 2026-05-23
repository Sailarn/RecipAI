const ENDPOINT = "https://query.wikidata.org/sparql";
const USER_AGENT = "RecipAI-ingredient-fetcher/1.0";

const CATEGORIES: Array<{ name: string; wikidataId: string }> = [
  { name: "vegetables", wikidataId: "Q11004" },
  { name: "fruits", wikidataId: "Q3314483" },
  { name: "meat", wikidataId: "Q10990" },
  { name: "fish", wikidataId: "Q152" },
  { name: "dairy", wikidataId: "Q185217" },
  { name: "grains", wikidataId: "Q12117" },
  { name: "legumes", wikidataId: "Q379813" },
  { name: "nuts", wikidataId: "Q11009" },
  { name: "spices", wikidataId: "Q42527" },
  { name: "herbs", wikidataId: "Q207123" },
  { name: "oils", wikidataId: "Q48803" },
  { name: "condiments", wikidataId: "Q2596997" },
  { name: "sweeteners", wikidataId: "Q3400794" },
  { name: "beverages", wikidataId: "Q40050" },
];

interface VocabEntry {
  id: string;
  en: string;
  ua: string;
  category: string;
  aliasesEn: string[];
  aliasesUa: string[];
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

async function fetchCategory(
  name: string,
  wikidataId: string,
): Promise<VocabEntry[]> {
  const query = `
SELECT DISTINCT ?en ?ua
  (GROUP_CONCAT(DISTINCT ?altEn; separator="|") AS ?aliasesEn)
  (GROUP_CONCAT(DISTINCT ?altUa; separator="|") AS ?aliasesUa)
WHERE {
  { ?item wdt:P31/wdt:P279* wd:${wikidataId} . }
  UNION
  { ?item wdt:P279/wdt:P279* wd:${wikidataId} . }
  ?item rdfs:label ?en FILTER(lang(?en) = "en")
  ?item rdfs:label ?ua FILTER(lang(?ua) = "uk")
  OPTIONAL { ?item skos:altLabel ?altEn FILTER(lang(?altEn) = "en") }
  OPTIONAL { ?item skos:altLabel ?altUa FILTER(lang(?altUa) = "uk") }
}
GROUP BY ?en ?ua
LIMIT 120`;

  const url = `${ENDPOINT}?query=${encodeURIComponent(query.trim())}&format=json`;
  const res = await fetch(url, {
    headers: {
      Accept: "application/sparql-results+json",
      "User-Agent": USER_AGENT,
    },
  });

  if (!res.ok) throw new Error(`Wikidata ${res.status} for ${name}`);

  const data = (await res.json()) as {
    results: { bindings: Array<Record<string, { value: string }>> };
  };

  const seenEn = new Set<string>();
  const entries: VocabEntry[] = [];

  for (const row of data.results.bindings) {
    const en = row.en.value;
    if (seenEn.has(en.toLowerCase())) continue;
    seenEn.add(en.toLowerCase());

    // Skip entries where ua is not Cyrillic (Wikidata sometimes stores scientific names as UK labels)
    if (!/\p{Script=Cyrillic}/u.test(row.ua.value)) continue;

    entries.push({
      id: slugify(en),
      en,
      ua: row.ua.value,
      category: name,
      aliasesEn: row.aliasesEn?.value
        ? row.aliasesEn.value.split("|").filter(Boolean).slice(0, 5)
        : [],
      aliasesUa: row.aliasesUa?.value
        ? row.aliasesUa.value.split("|").filter(Boolean).slice(0, 5)
        : [],
    });
  }

  return entries;
}

const all: VocabEntry[] = [];
const seenIds = new Set<string>();

for (const { name, wikidataId } of CATEGORIES) {
  console.log(`Fetching "${name}" (wd:${wikidataId})...`);
  try {
    const entries = await fetchCategory(name, wikidataId);
    for (const entry of entries) {
      if (seenIds.has(entry.id)) entry.id = `${name}-${entry.id}`;
      seenIds.add(entry.id);
      all.push(entry);
    }
    console.log(`  ✓ ${entries.length} entries`);
  } catch (err) {
    console.error(`  ✗ Failed: ${err}`);
  }
  await sleep(1200); // Wikidata policy: ~1 req/sec
}

console.log(`\nTotal: ${all.length} entries`);
await Bun.write("scripts/ingredients-seed.json", JSON.stringify(all, null, 2));
console.log("✓ Written to scripts/ingredients-seed.json");
