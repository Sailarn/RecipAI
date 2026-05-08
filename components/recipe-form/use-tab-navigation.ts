"use client";

import { useState } from "react";
import type { UseFormTrigger } from "react-hook-form";
import type { RecipeFormData } from "./schema";

export type TabKey = "info" | "ingredients" | "steps";
export type TabStatus = "valid" | "error" | "untouched";

export const TAB_KEYS: TabKey[] = ["info", "ingredients", "steps"];

export function useTabNavigation(trigger: UseFormTrigger<RecipeFormData>) {
  const [activeTab, setActiveTab] = useState<TabKey>("info");
  const [validatedTabs, setValidatedTabs] = useState<Record<TabKey, TabStatus>>(
    { info: "untouched", ingredients: "untouched", steps: "untouched" },
  );

  const activeTabIndex = TAB_KEYS.indexOf(activeTab);

  const validateCurrentTab = async (tab: TabKey): Promise<boolean> => {
    if (tab === "info") return trigger(["title", "servings"]);
    if (tab === "ingredients") return trigger("ingredients");
    return true;
  };

  const handleTabClick = async (tab: TabKey) => {
    const currentIdx = TAB_KEYS.indexOf(activeTab);
    const targetIdx = TAB_KEYS.indexOf(tab);

    if (targetIdx > currentIdx) {
      const isValid = await validateCurrentTab(activeTab);
      if (!isValid) {
        setValidatedTabs((prev) => ({ ...prev, [activeTab]: "error" }));
        return;
      }
      setValidatedTabs((prev) => ({ ...prev, [activeTab]: "valid" }));
    }

    setActiveTab(tab);
  };

  const handleNext = async () => {
    const nextIdx = activeTabIndex + 1;
    if (nextIdx >= TAB_KEYS.length) return;

    const isValid = await validateCurrentTab(activeTab);
    if (!isValid) {
      setValidatedTabs((prev) => ({ ...prev, [activeTab]: "error" }));
      return;
    }

    setValidatedTabs((prev) => ({ ...prev, [activeTab]: "valid" }));
    setActiveTab(TAB_KEYS[nextIdx]);
  };

  const handleBack = () => {
    const prevIdx = activeTabIndex - 1;
    if (prevIdx < 0) return;
    setActiveTab(TAB_KEYS[prevIdx]);
  };

  const getTabStyle = (tab: TabKey): React.CSSProperties => {
    const status = validatedTabs[tab];
    const isActive = activeTab === tab;

    if (isActive) {
      return {
        background: "rgba(255,180,60,0.22)",
        border: "1px solid rgba(255,210,120,0.50)",
        color: "var(--fg-1)",
        fontWeight: 700,
        boxShadow: "0 0 12px rgba(255,180,60,0.20)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
      };
    }

    if (status === "valid") {
      return {
        background: "rgba(74,222,128,0.15)",
        border: "1px solid rgba(74,222,128,0.40)",
        color: "#86efac",
        fontWeight: 500,
        boxShadow: "0 0 8px rgba(74,222,128,0.15)",
      };
    }

    if (status === "error") {
      return {
        background: "rgba(239,68,68,0.18)",
        border: "1px solid rgba(239,68,68,0.45)",
        color: "#fca5a5",
        fontWeight: 500,
      };
    }

    return {
      background: "rgba(255,170,50,0.07)",
      border: "1px solid rgba(255,200,100,0.14)",
      color: "var(--fg-3)",
      fontWeight: 500,
    };
  };

  const getTabPrefix = (tab: TabKey): string => {
    const status = validatedTabs[tab];
    if (status === "valid") return "✓ ";
    if (status === "error") return "✕ ";
    return "";
  };

  return {
    activeTab,
    activeTabIndex,
    validatedTabs,
    handleTabClick,
    handleNext,
    handleBack,
    getTabStyle,
    getTabPrefix,
  };
}
