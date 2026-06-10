import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { pushSubscriptions } from "@/db/schema/push-subscriptions";
import { ApiError } from "@/lib/api-errors";
import { auth } from "@/lib/auth/auth";

interface SubscribeBody {
  endpoint?: string;
  keys?: { p256dh?: string; auth?: string };
}

export async function POST(req: NextRequest) {
  let body: SubscribeBody;
  try {
    body = await req.json();
  } catch {
    return ApiError.invalidBody();
  }

  const { endpoint, keys } = body;
  if (!endpoint || !keys?.p256dh || !keys.auth) {
    return ApiError.badRequest("endpoint and keys required");
  }

  const session = await auth.api.getSession({ headers: await headers() });

  try {
    await db
      .insert(pushSubscriptions)
      .values({
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        userId: session?.user.id || null,
      })
      .onConflictDoUpdate({
        target: pushSubscriptions.endpoint,
        set: {
          p256dh: keys.p256dh,
          auth: keys.auth,
          userId: session?.user.id || null,
        },
      });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return ApiError.internal(error, req);
  }
}

export async function DELETE(req: NextRequest) {
  let body: { endpoint?: string };
  try {
    body = await req.json();
  } catch {
    return ApiError.invalidBody();
  }

  if (!body.endpoint) return ApiError.badRequest("endpoint required");

  try {
    await db
      .delete(pushSubscriptions)
      .where(eq(pushSubscriptions.endpoint, body.endpoint));
    return NextResponse.json({ ok: true });
  } catch (error) {
    return ApiError.internal(error, req);
  }
}
