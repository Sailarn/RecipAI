import { ExternalDeviceApproval } from "@/components/external-device-approval";

export default async function ExternalDevicePage({
  searchParams,
}: {
  searchParams: Promise<{ user_code?: string; locale?: string }>;
}) {
  const { user_code: userCode, locale = "en" } = await searchParams;
  if (!userCode) {
    return <main className="p-6">Missing authentication code.</main>;
  }
  return <ExternalDeviceApproval userCode={userCode} locale={locale} />;
}
