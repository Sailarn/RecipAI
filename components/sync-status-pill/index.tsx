"use client";

import { Loader2, Sparkles } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { useSyncStatus } from "@/lib/sync-context";

/** Quick syncs finish before this, so they don't flash the message. */
export const SYNC_MESSAGE_DELAY_MS = 300;
/** How long "N new recipes" stays up after a sync. */
export const NEW_RECIPES_MESSAGE_MS = 2500;

/**
 * Small message at the top of the recipe list while a background sync runs
 * (sign-in, returning to the app), so recipes added elsewhere — the Telegram
 * bot, another device, an AI app — don't appear without any sign. During a
 * pull-to-refresh the pull indicator already says "Refreshing…", so the
 * running message is suppressed then; the new-recipes count still shows.
 */
export function SyncStatusPill({ suppressSyncing = false }) {
  const t = useTranslations("recipes");
  const { syncing, newRecipes, finishedAt } = useSyncStatus();
  const reduceMotion = useReducedMotion();
  const [showSyncing, setShowSyncing] = useState(false);
  const [arrived, setArrived] = useState(0);

  useEffect(() => {
    if (!syncing) {
      setShowSyncing(false);
      return;
    }
    const timer = setTimeout(() => setShowSyncing(true), SYNC_MESSAGE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [syncing]);

  useEffect(() => {
    if (!finishedAt || newRecipes === 0) return;
    setArrived(newRecipes);
    const timer = setTimeout(() => setArrived(0), NEW_RECIPES_MESSAGE_MS);
    return () => clearTimeout(timer);
  }, [finishedAt, newRecipes]);

  let message: { key: string; text: string; busy: boolean } | null = null;
  if (showSyncing && !suppressSyncing) {
    message = { key: "syncing", text: t("syncing"), busy: true };
  } else if (arrived > 0 && !syncing) {
    message = {
      key: "arrived",
      text: t("syncNewRecipes", { count: arrived }),
      busy: false,
    };
  }

  const offset = reduceMotion ? 0 : -8;
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top)+10px)] z-40 flex justify-center"
    >
      <AnimatePresence>
        {message && (
          <motion.div
            key={message.key}
            initial={{ opacity: 0, y: offset }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: offset }}
            transition={{ duration: 0.2 }}
            className="flex items-center gap-1.5 rounded-full border border-[rgba(255,200,100,0.28)] bg-[rgba(255,170,50,0.16)] px-3.5 py-1.5 font-sans text-xs font-semibold text-[var(--fg-1)] shadow-[0_6px_20px_rgba(0,0,0,0.25)] backdrop-blur-[16px]"
          >
            {message.busy ? (
              <Loader2
                size={13}
                className="animate-spin text-[var(--food-accent)]"
                aria-hidden
              />
            ) : (
              <Sparkles
                size={13}
                className="text-[var(--food-accent)]"
                aria-hidden
              />
            )}
            <span>{message.text}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
