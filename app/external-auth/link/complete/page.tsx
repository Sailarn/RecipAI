import { ExternalLinkComplete } from "@/components/external-link";
import { ExternalAuthIntlProvider } from "../../intl-provider";

// No `?locale=` on the completion callback — Google controls that redirect —
// so this falls back to the default locale inside the provider.
export default async function ExternalLinkCompletePage({
  searchParams,
}: {
  searchParams: Promise<{ locale?: string }>;
}) {
  const { locale = "" } = await searchParams;

  return (
    <ExternalAuthIntlProvider locale={locale}>
      <ExternalLinkComplete />
    </ExternalAuthIntlProvider>
  );
}
