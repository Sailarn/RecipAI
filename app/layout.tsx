import type { Metadata } from "next";
import "./globals.css";

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
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
