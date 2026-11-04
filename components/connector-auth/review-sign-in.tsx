"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth/auth-client";
import { ConnectorAuthCard } from "./auth-card";

const INPUT_CLASS =
  "w-full rounded-[14px] border border-white/15 bg-white/5 px-3.5 py-2.5 text-base text-white outline-none focus:border-white/40";

type Status = "idle" | "working" | "done" | "failed";

/**
 * Sign-in for the AI-connector directory reviewers' account. Reached only by
 * the link in the submission's reviewer instructions; nothing in the app links
 * here. After signing in, the reviewer returns to Claude: the connector sign-in
 * page notices the session and continues to the consent step. The app's own
 * sign-in screen has no email option, so the signed-in card also links into
 * the app, where the reviewer can see the changes Claude made.
 */
export function ReviewSignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus("working");
    try {
      const result = await authClient.signIn.email({ email, password });
      setStatus(result?.error ? "failed" : "done");
    } catch {
      setStatus("failed");
    }
  };

  if (status === "done") {
    return (
      <ConnectorAuthCard title="Signed in">
        <p className="text-center text-sm leading-relaxed text-[var(--fg-2)]">
          You&apos;re signed in to the RecipAI review account. Go back to Claude
          and connect RecipAI (or reload the RecipAI sign-in tab if one is
          open): it will continue straight to the Allow step.
        </p>
        <a
          href="/"
          className="mt-5 block w-full rounded-[16px] bg-[var(--action-primary)] p-[13px] text-center font-sans text-[14px] font-bold text-white"
        >
          Open RecipAI
        </a>
      </ConnectorAuthCard>
    );
  }

  return (
    <ConnectorAuthCard title="Reviewer sign-in">
      <form onSubmit={submit} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm text-[var(--fg-2)]">
          Email
          <input
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={INPUT_CLASS}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-[var(--fg-2)]">
          Password
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={INPUT_CLASS}
          />
        </label>
        <button
          type="submit"
          disabled={status === "working"}
          className="mt-1 w-full rounded-[16px] bg-[var(--action-primary)] p-[13px] font-sans text-[14px] font-bold text-white disabled:opacity-60"
        >
          {status === "working" ? "Signing in…" : "Sign in"}
        </button>
        {status === "failed" && (
          <p className="text-center text-xs text-red-400">
            Wrong email or password.
          </p>
        )}
      </form>
    </ConnectorAuthCard>
  );
}
