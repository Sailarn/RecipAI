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

  const getTabClassName = (tab: TabKey): string => {
    const status = validatedTabs[tab];
    const isActive = activeTab === tab;

    if (isActive) {
      return "bg-[rgba(255,180,60,0.22)] border border-[rgba(255,210,120,0.50)] text-[var(--fg-1)] font-bold shadow-[0_0_12px_rgba(255,180,60,0.20)] backdrop-blur-[12px]";
    }
    if (status === "valid") {
      return "bg-[rgba(74,222,128,0.15)] border border-[rgba(74,222,128,0.40)] text-[#86efac] font-medium shadow-[0_0_8px_rgba(74,222,128,0.15)]";
    }
    if (status === "error") {
      return "bg-[rgba(239,68,68,0.18)] border border-[rgba(239,68,68,0.45)] text-[#fca5a5] font-medium";
    }
    return "bg-[rgba(255,170,50,0.07)] border border-[rgba(255,200,100,0.14)] text-[var(--fg-3)] font-medium";
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
    getTabClassName,
    getTabPrefix,
  };
}
