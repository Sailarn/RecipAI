import { ExternalDeviceApproval } from "@/components/external-device-approval";
import { ExternalAuthIntlProvider } from "../intl-provider";
import { MissingCode } from "./missing-code";

export default async function ExternalDevicePage({
  searchParams,
}: {
  searchParams: Promise<{ user_code?: string; locale?: string }>;
}) {
  const { user_code: userCode, locale = "" } = await searchParams;

  return (
    <ExternalAuthIntlProvider locale={locale}>
      {userCode ? (
        <ExternalDeviceApproval userCode={userCode} locale={locale} />
      ) : (
        <MissingCode />
      )}
    </ExternalAuthIntlProvider>
  );
}
