import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "RecipAI",
  description: "Save and manage your favorite recipes offline",
  manifest: "/manifest.json",
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
