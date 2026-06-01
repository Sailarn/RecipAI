"use client";

import { ChevronLeft } from "lucide-react";
import { TAB_KEYS, type TabKey } from "./use-tab-navigation";

interface FormHeaderProps {
  backLabel: string;
  onBack: () => void;
  activeTab: TabKey;
  activeTabIndex: number;
  tabLabels: Record<TabKey, string>;
  onTabClick: (tab: TabKey) => void;
  getTabStyle: (tab: TabKey) => React.CSSProperties;
  getTabPrefix: (tab: TabKey) => string;
}

export function FormHeader({
  backLabel,
  onBack,
  activeTab: _activeTab,
  activeTabIndex,
  tabLabels,
  onTabClick,
  getTabStyle,
  getTabPrefix,
}: FormHeaderProps) {
  const progressPercent = ((activeTabIndex + 1) / TAB_KEYS.length) * 100;

  return (
    <div
      style={{
        position: "relative",
        zIndex: 2,
        flexShrink: 0,
        padding: "max(16px, env(safe-area-inset-top, 16px)) 16px 0",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
        }}
      >
        <button
          type="button"
          onClick={onBack}
          style={{
            background: "none",
            border: "none",
            color: "var(--fg-2)",
            fontSize: 13,
            fontWeight: 500,
            fontFamily: "var(--font-sans)",
            display: "flex",
            alignItems: "center",
            gap: 4,
            cursor: "pointer",
            padding: 0,
          }}
        >
          <ChevronLeft
            width={14}
            height={14}
            strokeWidth={2}
            style={{ color: "var(--fg-2)" }}
            aria-hidden="true"
          />
          {backLabel}
        </button>
        <div style={{ width: 60 }} />
      </div>

      {/* Tab Step Indicators */}
      <div
        style={{
          display: "flex",
          gap: 8,
          justifyContent: "center",
          marginBottom: 16,
        }}
      >
        {TAB_KEYS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => onTabClick(tab)}
            style={{
              padding: "7px 16px",
              borderRadius: 99,
              fontSize: 12,
              fontFamily: "var(--font-sans)",
              cursor: "pointer",
              transition: "all 0.15s ease",
              ...getTabStyle(tab),
            }}
          >
            {getTabPrefix(tab)}
            {tabLabels[tab]}
          </button>
        ))}
      </div>

      {/* Progress Bar */}
      <div
        style={{
          height: 2,
          background: "rgba(255,200,100,0.10)",
          borderRadius: 1,
          marginBottom: 2,
        }}
      >
        <div
          style={{
            height: "100%",
            background: "rgba(255,180,60,0.55)",
            borderRadius: 1,
            width: `${progressPercent}%`,
            transition: "width 0.3s ease",
          }}
        />
      </div>
    </div>
  );
}
