import type { Metadata, Viewport } from "next";

export const viewport: Viewport = {
  // Two entries so the initial HTML matches system preference before JS runs.
  // ThemeColorSync in [locale]/layout.tsx takes over once JS is hydrated to
  // handle user-overridden themes (app dark when system is light, etc.).
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export const metadata: Metadata = {
  title: "RecipAI",
  description: "Save and manage your favorite recipes offline",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon-192x192.png",
    apple: "/icon-192x192.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "RecipAI",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
