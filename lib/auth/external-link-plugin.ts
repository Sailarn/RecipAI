import { createHash } from "node:crypto";
import { createAuthEndpoint } from "@better-auth/core/api";
import { sessionMiddleware } from "better-auth/api";
import { deleteSessionCookie, setSessionCookie } from "better-auth/cookies";
import { generateRandomString } from "better-auth/crypto";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { verification } from "@/db/schema/auth";
import { EXTERNAL_AUTH_TTL_MS } from "./external-auth-config";

const EXTERNAL_LINK_PREFIX = "external-link:";
const COOKIE_MAX_AGE_SECONDS = EXTERNAL_AUTH_TTL_MS / 1000;

export function hashExternalLinkToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function getExternalLinkExpiry(now = new Date()): Date {
  return new Date(now.getTime() + EXTERNAL_AUTH_TTL_MS);
}

function tokenIdentifier(token: string): string {
  return `${EXTERNAL_LINK_PREFIX}${hashExternalLinkToken(token)}`;
}

export function externalLink() {
  return {
    id: "external-link",
    endpoints: {
      externalLinkGenerate: createAuthEndpoint(
        "/external-link/generate",
        { method: "POST", use: [sessionMiddleware] },
        async (context) => {
          const token = generateRandomString(32);
          const expiresAt = getExternalLinkExpiry();
          await context.context.internalAdapter.createVerificationValue({
            identifier: tokenIdentifier(token),
            value: context.context.session.user.id,
            expiresAt,
          });
          return context.json({ token, expiresAt });
        },
      ),
      externalLinkRedeem: createAuthEndpoint(
        "/external-link/redeem",
        {
          method: "POST",
          body: z.object({ token: z.string().min(1) }),
        },
        async (context) => {
          const identifier = tokenIdentifier(context.body.token);
          // Atomic consume: a single DELETE ... RETURNING serializes concurrent
          // redeems, so one handoff token can create at most one temporary
          // session even if two requests race.
          const [consumed] = await db
            .delete(verification)
            .where(eq(verification.identifier, identifier))
            .returning();
          if (!consumed) {
            throw context.error("BAD_REQUEST", {
              message: "Invalid or already used handoff token",
            });
          }
          if (consumed.expiresAt < new Date()) {
            throw context.error("BAD_REQUEST", {
              message: "Handoff token expired",
            });
          }

          const expiresAt = getExternalLinkExpiry();
          const temporarySession =
            await context.context.internalAdapter.createSession(
              consumed.value,
              true,
              { expiresAt },
            );
          const sessionWithUser =
            await context.context.internalAdapter.findSession(
              temporarySession.token,
            );
          if (!sessionWithUser) {
            throw context.error("INTERNAL_SERVER_ERROR", {
              message: "Unable to create temporary linking session",
            });
          }

          await setSessionCookie(context, sessionWithUser, true, {
            expires: expiresAt,
            maxAge: COOKIE_MAX_AGE_SECONDS,
          });
          return context.json({
            user: sessionWithUser.user,
            expiresAt,
          });
        },
      ),
      externalDeviceSession: createAuthEndpoint(
        "/external-link/device-session",
        {
          method: "POST",
          body: z.object({ token: z.string().min(1) }),
        },
        async (context) => {
          // The device-authorization grant returns a session token as its
          // access_token but never sets a browser cookie (it is a bearer-token
          // grant). Set the session cookie for that already-created session so
          // the installed PWA actually becomes signed in. Possession of the
          // session token is the authorization, exactly like the redeem handoff.
          const sessionWithUser =
            await context.context.internalAdapter.findSession(
              context.body.token,
            );
          if (!sessionWithUser) {
            throw context.error("UNAUTHORIZED", {
              message: "Invalid or expired device session",
            });
          }
          await setSessionCookie(context, sessionWithUser);
          return context.json({ user: sessionWithUser.user });
        },
      ),
      externalLinkCleanup: createAuthEndpoint(
        "/external-link/cleanup",
        { method: "POST", use: [sessionMiddleware] },
        async (context) => {
          await context.context.internalAdapter.deleteSession(
            context.context.session.session.token,
          );
          deleteSessionCookie(context);
          return context.json({ success: true });
        },
      ),
    },
  };
}
