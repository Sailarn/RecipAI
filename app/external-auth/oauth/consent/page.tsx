import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";
import { ConnectorAuthCard } from "@/components/connector-auth/auth-card";
import { ConnectorConsent } from "@/components/connector-auth/connector-consent";
import { localeFromAcceptLanguage } from "@/i18n/accept-language";
import { auth } from "@/lib/auth/auth";
import { findOAuthClientName } from "@/lib/mcp/clients";
import { ExternalAuthIntlProvider } from "../../intl-provider";
import { firstParam, type PageSearchParams } from "../search-params";

// The better-auth `mcp` plugin redirects here (always — see
// lib/auth/mcp-consent.ts) with a one-time consent code once the user is
// signed in. Approving exchanges it for an authorization code.
export default async function ConnectorConsentPage({
  searchParams,
}: {
  searchParams: Promise<PageSearchParams>;
}) {
  const params = await searchParams;
  const requestHeaders = await headers();
  const locale = localeFromAcceptLanguage(
    requestHeaders.get("accept-language"),
  );
  const t = await getTranslations({ locale, namespace: "connector" });

  const consentCode = firstParam(params, "consent_code");
  const [session, storedName] = await Promise.all([
    auth.api.getSession({ headers: requestHeaders }).catch(() => null),
    findOAuthClientName(firstParam(params, "client_id")).catch(() => null),
  ]);

  if (!consentCode || !session) {
    return (
      <ExternalAuthIntlProvider locale={locale}>
        <ConnectorAuthCard title={t("invalidTitle")}>
          <p className="text-center text-sm text-[var(--fg-2)]">
            {t("startAgain")}
          </p>
        </ConnectorAuthCard>
      </ExternalAuthIntlProvider>
    );
  }

  return (
    <ExternalAuthIntlProvider locale={locale}>
      <ConnectorConsent
        consentCode={consentCode}
        clientName={storedName ?? t("unknownClient")}
        account={session.user.name || session.user.email}
      />
    </ExternalAuthIntlProvider>
  );
}
