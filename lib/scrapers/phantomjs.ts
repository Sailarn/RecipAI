export async function fetchHtmlWithPhantomJs(url: string): Promise<string> {
  const apiKey = process.env.PHANTOMJS_API_KEY;
  if (!apiKey) throw new Error("PHANTOMJS_API_KEY not configured");

  const requestPayload = {
    url,
    renderType: "html",
    outputAsJson: true,
    requestSettings: {
      waitInterval: 2000,
      resourceWait: 5000,
    },
    pageSettings: {
      javascriptEnabled: true,
      loadImages: false,
    },
  };

  const response = await fetch(
    `https://phantomjscloud.com/api/browser/v2/${apiKey}/`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pages: [requestPayload] }),
    },
  );

  if (!response.ok) {
    throw new Error(`PhantomJsCloud error: ${response.statusText}`);
  }

  const data = await response.json();
  console.log("PhantomJs response keys:", JSON.stringify(Object.keys(data)));
  console.log("PhantomJs full response:", JSON.stringify(data).slice(0, 500));
  console.log(
    "pageResponse[0] keys:",
    JSON.stringify(Object.keys(data.pageResponses?.[0] || {})),
  );
  const html =
    data?.pageResponses?.[0]?.frameData?.content ||
    data?.content?.data ||
    data?.pageResponses?.[0]?.content?.data;
  if (!html) throw new Error("PhantomJsCloud returned no HTML");
  if (html.length < 1000)
    throw new Error(
      `PhantomJsCloud returned too little HTML (${html.length} chars)`,
    );

  return html;
}
