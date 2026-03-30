import { redirect } from "next/navigation";
import { routes } from "@/lib/routes";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect(routes.recipes.list(locale));
}
