import { ExternalLink } from "@/components/external-link";

export default async function ExternalLinkPage({
  searchParams,
}: {
  searchParams: Promise<{ locale?: string }>;
}) {
  const { locale = "en" } = await searchParams;
  return <ExternalLink locale={locale} />;
}
