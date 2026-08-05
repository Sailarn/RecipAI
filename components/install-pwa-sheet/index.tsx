"use client";

import { Share, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { createPortal } from "react-dom";

interface InstallPwaSheetProps {
  isIOS: boolean;
  onClose: () => void;
}

export function InstallPwaSheet({ isIOS, onClose }: InstallPwaSheetProps) {
  const t = useTranslations("install");
  const tCommon = useTranslations("common");
  const [closing, setClosing] = useState(false);

  function requestClose() {
    if (closing) return;
    setClosing(true);
  }

  return createPortal(
    <div className="fixed inset-0 z-[500] flex items-end touch-none">
      <button
        type="button"
        aria-label={tCommon("close")}
        onClick={requestClose}
        className="absolute inset-0 bg-black/55 backdrop-blur-[4px] border-none cursor-pointer p-0"
      />

      <div
        onAnimationEnd={() => {
          if (closing) onClose();
        }}
        className="relative z-[1] w-full bg-[rgba(18,14,8,0.92)] backdrop-blur-[32px] backdrop-saturate-200 border border-[rgba(255,200,100,0.18)] rounded-t-[28px] px-[18px] pt-5 pb-9 shadow-[0_-8px_40px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,220,130,0.12)]"
        style={{
          animation: closing
            ? "sheetSlideDown 0.28s cubic-bezier(0.32, 0.72, 0, 1) forwards"
            : "sheetSlideUp 0.35s cubic-bezier(0.32, 0.72, 0, 1)",
        }}
      >
        <button
          type="button"
          onClick={requestClose}
          aria-label={tCommon("close")}
          className="absolute top-4 right-4 text-[var(--fg-3)] bg-transparent border-none cursor-pointer p-1"
        >
          <X size={18} />
        </button>

        <div className="w-9 h-1 rounded-[2px] bg-[rgba(255,200,100,0.25)] mx-auto mb-5" />

        <p className="text-4xl text-center mb-3" aria-hidden="true">
          📲
        </p>
        <p className="text-[17px] font-bold text-[var(--fg-1)] font-display text-center mb-2">
          {t("title")}
        </p>
        <p className="text-[13px] text-[var(--fg-2)] leading-[1.65] text-center mb-6">
          {t("body")}
        </p>

        {isIOS ? <IOSSteps /> : <FallbackNote />}
      </div>
    </div>,
    document.body,
  );
}

function IOSSteps() {
  const t = useTranslations("install");

  return (
    <>
      <ol className="flex flex-col gap-3 mb-6">
        <Step number={1}>
          {t.rich("step1", {
            share: (chunks) => (
              <span className="inline-flex items-center gap-1 text-[var(--fg-1)] font-medium">
                {chunks} <Share size={13} className="inline" />
              </span>
            ),
          })}
        </Step>
        <Step number={2}>{t("step2")}</Step>
        <Step number={3}>{t("step3")}</Step>
      </ol>
      <p className="text-[11px] text-[var(--fg-3)] text-center">
        {t("iosNote")}
      </p>
    </>
  );
}

function FallbackNote() {
  const t = useTranslations("install");

  return (
    <p className="text-[13px] text-[var(--fg-2)] leading-[1.65] text-center">
      {t.rich("fallback", {
        b: (chunks) => (
          <span className="text-[var(--fg-1)] font-medium">{chunks}</span>
        ),
      })}
    </p>
  );
}

function Step({
  number,
  children,
}: {
  number: number;
  children: React.ReactNode;
}) {
  return (
    <li className="flex items-start gap-3">
      <span className="shrink-0 w-6 h-6 rounded-full bg-[rgba(255,200,100,0.12)] border border-[rgba(255,200,100,0.2)] flex items-center justify-center text-[11px] font-bold text-[var(--food-accent)]">
        {number}
      </span>
      <span className="text-[13px] text-[var(--fg-2)] leading-[1.6] pt-0.5">
        {children}
      </span>
    </li>
  );
}
