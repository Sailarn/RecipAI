"use client";

import { Bot, LogOut } from "lucide-react";
import { useFeature } from "@/lib/platform";

interface UserCardProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  telegramLinked: boolean;
  onSignOut: () => void;
}

export function UserCard({ user, telegramLinked, onSignOut }: UserCardProps) {
  const initial = (user.name || user.email || "?")[0].toUpperCase();
  // In Telegram the identity is fixed (auto sign-in), so sign-out and the bot
  // link are hidden — the card is just an identity display.
  const showActions = useFeature("accountActions");

  return (
    <div className="glass-card mb-3 rounded-3xl px-4 py-5">
      <div className="flex flex-col items-center gap-2 mb-[18px]">
        {user.image ? (
          // biome-ignore lint/performance/noImgElement: external avatar URL from OAuth provider
          <img
            src={user.image}
            alt={user.name ?? ""}
            className="w-16 h-16 rounded-full object-cover"
          />
        ) : (
          <div className="w-16 h-16 rounded-full bg-[linear-gradient(135deg,#7c3aed,#5b21b6)] flex items-center justify-center shadow-[0_6px_20px_rgba(124,58,237,0.40)]">
            <span className="text-[26px] font-bold text-white">{initial}</span>
          </div>
        )}

        <p className="font-display font-bold text-base text-[var(--fg-1)] text-center">
          {user.name}
        </p>
        <p className="font-sans text-xs text-[var(--fg-2)] text-center mt-0.5">
          {user.email}
        </p>
      </div>

      {showActions && telegramLinked && (
        <>
          <a
            href={`https://t.me/${process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-[7px] w-full p-3 bg-[rgba(255,170,50,0.10)] border border-[rgba(255,200,100,0.22)] backdrop-blur-[12px] rounded-[14px] font-sans text-sm font-semibold text-[var(--fg-1)] no-underline mb-2 cursor-pointer"
          >
            <Bot size={15} className="text-[var(--food-accent)] shrink-0" />
            <span>Open Recipe Bot</span>
          </a>
          <p className="font-sans text-[11px] text-[var(--fg-3)] text-center leading-[1.6] mb-3.5 px-1">
            Send any recipe URL or supported social post to your bot — it'll
            save it to your account automatically.
          </p>
        </>
      )}

      {showActions && (
        <button
          type="button"
          onClick={onSignOut}
          className="flex items-center justify-center gap-[7px] w-full p-3 rounded-[14px] border border-[rgba(239,68,68,0.22)] bg-[rgba(239,68,68,0.10)] text-[var(--action-destructive)] font-sans text-sm font-semibold cursor-pointer"
        >
          <LogOut
            size={15}
            className="text-[var(--action-destructive)] shrink-0"
          />
          <span>Sign out</span>
        </button>
      )}
    </div>
  );
}
