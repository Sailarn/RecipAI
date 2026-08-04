import { ExternalLink } from "@/components/external-link";
import { ExternalAuthIntlProvider } from "../intl-provider";

export default async function ExternalLinkPage({
  searchParams,
}: {
  searchParams: Promise<{ locale?: string }>;
}) {
  const { locale = "" } = await searchParams;

  return (
    <ExternalAuthIntlProvider locale={locale}>
      <ExternalLink locale={locale} />
    </ExternalAuthIntlProvider>
  );
}
