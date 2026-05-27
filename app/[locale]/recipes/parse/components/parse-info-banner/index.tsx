import { Info } from "lucide-react";

export function ParseInfoBanner() {
  return (
    <div className="glass-subtle flex gap-[9px] items-start mb-4 rounded-[14px] py-[10px] px-[12px]">
      <Info
        size={13}
        strokeWidth={2}
        className="text-[rgba(147,197,253,0.8)] shrink-0 mt-[1px]"
      />
      <div>
        <p className="text-[12px] text-[var(--fg-2)] leading-[1.55]">
          Works with any recipe website — just paste the URL below.
        </p>
        <p className="text-[12px] text-[var(--fg-3)] leading-[1.55] mt-[2px]">
          Examples: silpo.ua, allrecipes.com, bbcgoodfood.com,
          cooking.nytimes.com
        </p>
      </div>
    </div>
  );
}
