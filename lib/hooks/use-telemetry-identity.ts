"use client";

import { useEffect, useRef } from "react";
import { authClient } from "@/lib/auth/auth-client";
import { identifyUser, resetIdentity } from "@/lib/telemetry";

/**
 * Links PostHog identity to the authenticated user, app-wide (mounted in
 * ClientShell so it runs on every page, not just the recipes list).
 *
 * Resets only on a genuine sign-out transition. Resetting while the session is
 * still loading, or on an anonymous page load, would churn the anonymous
 * distinct id and fragment one visitor into many persons.
 */
export function useTelemetryIdentity() {
  const { data: session, isPending } = authClient.useSession();
  const wasSignedIn = useRef(false);

  useEffect(() => {
    if (isPending) return;
    if (session) {
      const { id, email, name, image } = session.user;
      // Providers differ: a passkey- or Telegram-only account may have no
      // email or avatar. Include each property only when set so a later
      // session never overwrites an earlier provider's value with a blank.
      const personProperties: Record<string, unknown> = {
        locale: window.location.pathname.split("/")[1],
      };
      if (email) personProperties.email = email;
      if (name) personProperties.name = name;
      if (image) personProperties.image = image;
      identifyUser(id, personProperties);
      wasSignedIn.current = true;
    } else if (wasSignedIn.current) {
      resetIdentity();
      wasSignedIn.current = false;
    }
  }, [session, isPending]);
}
