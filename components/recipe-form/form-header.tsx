"use client";

import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { TAB_KEYS, type TabKey } from "./use-tab-navigation";

interface FormHeaderProps {
  backLabel: string;
  onBack: () => void;
  activeTab: TabKey;
  activeTabIndex: number;
  tabLabels: Record<TabKey, string>;
  onTabClick: (tab: TabKey) => void;
  getTabClassName: (tab: TabKey) => string;
  getTabPrefix: (tab: TabKey) => string;
}

export function FormHeader({
  backLabel,
  onBack,
  activeTab: _activeTab,
  activeTabIndex,
  tabLabels,
  onTabClick,
  getTabClassName,
  getTabPrefix,
}: FormHeaderProps) {
  const progressPercent = ((activeTabIndex + 1) / TAB_KEYS.length) * 100;

  return (
    <div className="relative z-[2] shrink-0 pt-[max(16px,env(safe-area-inset-top,16px))] px-4 pb-0">
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={onBack}
          className="bg-transparent border-0 text-[var(--fg-2)] text-[13px] font-medium font-[family-name:var(--font-sans)] flex items-center gap-1 cursor-pointer p-0"
        >
          <ChevronLeft
            width={14}
            height={14}
            strokeWidth={2}
            className="text-[var(--fg-2)]"
            aria-hidden="true"
          />
          {backLabel}
        </button>
        <div className="w-[60px]" />
      </div>

      <div className="flex gap-2 justify-center mb-4">
        {TAB_KEYS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => onTabClick(tab)}
            className={cn(
              "py-[7px] px-4 rounded-full text-[12px] font-[family-name:var(--font-sans)] cursor-pointer transition-all duration-150 ease",
              getTabClassName(tab),
            )}
          >
            {getTabPrefix(tab)}
            {tabLabels[tab]}
          </button>
        ))}
      </div>

      <div className="h-0.5 bg-[rgba(255,200,100,0.10)] rounded-[1px] mb-0.5">
        <div
          className="h-full bg-[rgba(255,180,60,0.55)] rounded-[1px] transition-[width] duration-300 ease"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </div>
  );
}
