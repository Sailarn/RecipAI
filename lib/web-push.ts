import webPush from "web-push";

let initialised = false;

function init() {
  if (initialised) return;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) return;
  webPush.setVapidDetails(subject, publicKey, privateKey);
  initialised = true;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

export interface PushTarget {
  endpoint: string;
  p256dh: string;
  auth: string;
}

// Keep an undelivered "recipe ready" push for up to a day, then let it expire —
// a stale prompt past that is just noise (the recipe is already saved).
const PUSH_TTL_SECONDS = 86_400;

export async function sendPushNotification(
  target: PushTarget,
  payload: PushPayload,
): Promise<void> {
  init();
  await webPush.sendNotification(
    {
      endpoint: target.endpoint,
      keys: { p256dh: target.p256dh, auth: target.auth },
    },
    JSON.stringify(payload),
    // urgency "high" tells APNs / the push service to deliver immediately rather
    // than batching it — without it iOS can sit on the push for minutes.
    { urgency: "high", TTL: PUSH_TTL_SECONDS },
  );
}
