export async function fetchHtmlWithScrapeDo(url: string): Promise<string> {
  const token = process.env.SCRAPE_DO_TOKEN;
  if (!token) throw new Error("SCRAPE_DO_TOKEN not configured");

  const scrapeUrl = `http://api.scrape.do/?token=${token}&url=${encodeURIComponent(url)}&render=true`;

  const response = await fetch(scrapeUrl, {
    method: "GET",
    headers: {
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
  });

  if (!response.ok) {
    throw new Error(`scrape.do error: ${response.statusText}`);
  }

  return response.text();
}
