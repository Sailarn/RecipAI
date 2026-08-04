import { OfflineNotice } from "./offline-notice";

// Served by the service worker when a navigation fails with no cached copy.
// This route lives outside the [locale] tree, so there is no next-intl context
// here — OfflineNotice picks its language client-side instead.
export default function OfflinePage() {
  return <OfflineNotice />;
}
