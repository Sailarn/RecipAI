import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";
import { ConnectorLogin } from "@/components/connector-auth/connector-login";
import { localeFromAcceptLanguage } from "@/i18n/accept-language";
import { findOAuthClientName } from "@/lib/mcp/clients";
import { MCP_AUTHORIZE_PATH } from "@/lib/mcp/config";
import { ExternalAuthIntlProvider } from "../../intl-provider";
import {
  firstParam,
  type PageSearchParams,
  toQueryString,
} from "../search-params";

// The better-auth `mcp` plugin sends an AI chat app's authorize request here
// when the browser has no RecipAI session, with the original query intact.
export default async function ConnectorLoginPage({
  searchParams,
}: {
  searchParams: Promise<PageSearchParams>;
}) {
  const params = await searchParams;
  const locale = localeFromAcceptLanguage(
    (await headers()).get("accept-language"),
  );
  const t = await getTranslations({ locale, namespace: "connector" });
  const clientName =
    (await findOAuthClientName(firstParam(params, "client_id")).catch(
      () => null,
    )) ?? t("unknownClient");

  return (
    <ExternalAuthIntlProvider locale={locale}>
      <ConnectorLogin
        authorizeUrl={`${MCP_AUTHORIZE_PATH}?${toQueryString(params)}`}
        clientName={clientName}
      />
    </ExternalAuthIntlProvider>
  );
}
