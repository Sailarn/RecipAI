"use client";

import { useState } from "react";
import { externalAuthClient } from "@/lib/auth/external-auth-client";
import { getExternalAuthUrl } from "@/lib/auth/external-auth-config";
import { routes } from "@/lib/routes";

export function ExternalDeviceApproval({
  userCode,
  locale,
}: {
  userCode: string;
  locale: string;
}) {
  const { data: session, isPending } = externalAuthClient.useSession();
  const [status, setStatus] = useState<"idle" | "working" | "done" | "error">(
    "idle",
  );
  const externalOrigin = getExternalAuthUrl({
    configuredUrl: process.env.NEXT_PUBLIC_EXTERNAL_AUTH_URL,
  });
  const returnPath = routes.externalAuth.device(userCode, locale);

  const signIn = () =>
    externalAuthClient.signIn.social({
      provider: "google",
      callbackURL: `${externalOrigin}${returnPath}`,
    });

  const decide = async (approved: boolean) => {
    setStatus("working");
    try {
      const verification = await externalAuthClient.device({
        query: { user_code: userCode },
      });
      if (verification.error) {
        setStatus("error");
        return;
      }
      const result = approved
        ? await externalAuthClient.device.approve({ userCode })
        : await externalAuthClient.device.deny({ userCode });
      if (result.error) {
        setStatus("error");
        return;
      }
      await externalAuthClient.signOut();
      setStatus("done");
    } catch {
      setStatus("error");
    }
  };

  if (isPending) return <AuthCard>Checking authentication…</AuthCard>;
  if (status === "done") {
    return <AuthCard>Done. Return to RecipAI.</AuthCard>;
  }
  if (status === "error") {
    return <AuthCard>This request is invalid or expired.</AuthCard>;
  }
  if (!session) {
    return (
      <AuthCard>
        <button type="button" className="signin-btn" onClick={signIn}>
          Continue with Google
        </button>
      </AuthCard>
    );
  }

  return (
    <AuthCard>
      <p>Continue as {session.user.email || session.user.name}?</p>
      <button
        type="button"
        className="signin-btn"
        disabled={status === "working"}
        onClick={() => decide(true)}
      >
        Continue to RecipAI
      </button>
      <button
        type="button"
        className="signin-btn"
        disabled={status === "working"}
        onClick={() => decide(false)}
      >
        Deny
      </button>
    </AuthCard>
  );
}

function AuthCard({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen flex items-center justify-center p-5 bg-[var(--app-mesh)]">
      <div className="glass-card w-full max-w-sm rounded-3xl p-6 flex flex-col gap-4 text-center">
        {children}
      </div>
    </main>
  );
}
