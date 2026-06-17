// start_url points at a zero-CSS static shell page that paints dark instantly
// and JS-redirects to the real app. WebKit keeps the dark shell visible until
// the real page completes its first paint, giving a native-feeling dark launch.
export async function GET() {
  return Response.json(
    {
      name: "RecipAI - Offline Recipe Manager",
      short_name: "RecipAI",
      description: "Save and manage your favorite recipes offline",
      start_url: "/pwa-launch.html",
      display: "standalone",
      background_color: "#0a0a0a",
      theme_color: "#0a0a0a",
      orientation: "portrait-primary",
      icons: [
        {
          src: "/icon-192x192.png",
          sizes: "192x192",
          type: "image/png",
          purpose: "any",
        },
        {
          src: "/icon-192x192.png",
          sizes: "192x192",
          type: "image/png",
          purpose: "maskable",
        },
        {
          src: "/icon-512x512.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "any",
        },
        {
          src: "/icon-512x512.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "maskable",
        },
      ],
    },
    {
      headers: {
        "Content-Type": "application/manifest+json",
        "Cache-Control": "no-cache",
      },
    },
  );
}
