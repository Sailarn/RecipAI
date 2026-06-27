"use client";

import { Copy, Link2, Share2 } from "lucide-react";

interface ShareLinksProps {
  shareUrl: string;
  onCopy: () => void;
  onShareMore: () => void;
}

export function ShareLinks({ shareUrl, onCopy, onShareMore }: ShareLinksProps) {
  return (
    <div className="mt-4 space-y-3">
      <div className="flex items-center gap-3 overflow-hidden rounded-[16px] border border-[rgba(255,190,75,0.25)] bg-[rgba(130,79,15,0.14)] px-4 py-3.5 text-[13px] text-white/85">
        <Link2 size={17} className="shrink-0 text-white/55" />
        <span className="truncate">{shareUrl.replace(/^https?:\/\//, "")}</span>
      </div>
      <button
        type="button"
        onClick={onCopy}
        className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-[16px] border-0 bg-[var(--action-primary)] px-4 py-3.5 text-[15px] font-semibold text-white shadow-[0_8px_24px_color-mix(in_oklch,var(--action-primary)_25%,transparent)]"
      >
        <Copy size={18} />
        Copy link
      </button>
      <button
        type="button"
        onClick={onShareMore}
        className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-[16px] border border-white/15 bg-white/[0.03] px-4 py-3.5 text-[15px] font-semibold text-white"
      >
        <Share2 size={18} />
        More options
      </button>
    </div>
  );
}
