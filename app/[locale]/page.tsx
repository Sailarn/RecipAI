import { redirect } from "next/navigation";
import { routes } from "@/lib/routes";

// Normally unreachable: the proxy rewrites the locale root straight to the
// recipes list so a cold launch pays one redirect instead of two. Kept as a
// fallback for requests that bypass middleware.

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect(routes.recipes.list(locale));
}
