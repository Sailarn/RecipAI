import { Info } from "lucide-react";
import { useTranslations } from "next-intl";

export function ParseInfoBanner() {
  const t = useTranslations("parse");
  return (
    <div className="glass-subtle flex gap-[9px] items-start mb-4 rounded-[14px] py-[10px] px-[12px]">
      <Info
        size={13}
        strokeWidth={2}
        className="text-[rgba(147,197,253,0.8)] shrink-0 mt-[1px]"
      />
      <div>
        <p className="text-[12px] text-[var(--fg-2)] leading-[1.55]">
          {t("infoWorks")}
        </p>
        <p className="text-[12px] text-[var(--fg-3)] leading-[1.55] mt-[2px]">
          {t("infoExamples")}
        </p>
      </div>
    </div>
  );
}
