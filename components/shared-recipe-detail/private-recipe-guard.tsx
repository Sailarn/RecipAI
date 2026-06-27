"use client";

import { ArrowLeft, Lock } from "lucide-react";
import { useEffect, useState } from "react";
import { routes } from "@/lib/routes";
import { useNavigate } from "@/lib/transitions";

const REDIRECT_SECONDS = 4;

export function PrivateRecipeGuard({ locale }: { locale: string }) {
  const navigate = useNavigate();
  const [seconds, setSeconds] = useState(REDIRECT_SECONDS);
  const recipesUrl = routes.recipes.list(locale);

  useEffect(() => {
    const redirect = window.setTimeout(
      () => navigate.replace(recipesUrl),
      REDIRECT_SECONDS * 1000,
    );
    const countdown = window.setInterval(
      () => setSeconds((current) => Math.max(0, current - 1)),
      1000,
    );
    return () => {
      window.clearTimeout(redirect);
      window.clearInterval(countdown);
    };
  }, [navigate, recipesUrl]);

  return (
    <div className="h-full flex flex-col items-center justify-center px-9 text-center bg-[var(--bg-base)]">
      <div className="w-[88px] h-[88px] rounded-[28px] flex items-center justify-center mb-6 bg-[rgba(255,170,50,0.1)] border border-[rgba(255,200,100,0.2)] shadow-[0_0_40px_rgba(251,146,60,0.15)]">
        <Lock size={38} className="text-amber-400" />
      </div>
      <h1 className="font-[family-name:var(--font-display)] text-[26px] font-bold text-[var(--fg-1)] mb-3">
        This recipe is private
      </h1>
      <p className="text-sm text-[var(--fg-2)] leading-relaxed mb-8 max-w-[280px]">
        The owner has not made this recipe public, or sharing was turned off.
      </p>
      <button
        type="button"
        onClick={() => navigate.replace(recipesUrl)}
        className="flex items-center gap-2 px-7 py-[15px] rounded-[18px] border-0 bg-[var(--action-primary)] text-white text-[15px] font-bold shadow-[0_6px_24px_color-mix(in_oklch,var(--action-primary)_45%,transparent)]"
      >
        <ArrowLeft size={18} />
        Back to recipes
      </button>
      <p className="mt-[18px] text-xs text-[var(--fg-3)]">
        Returning automatically in {seconds}s
      </p>
    </div>
  );
}
