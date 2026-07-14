"use client";

import { useTranslations } from "next-intl";
import { RecipeImage } from "@/components/recipe-image";
import {
  groupBySectionRuns,
  sectionName,
  shouldShowSections,
} from "@/lib/db/recipe-sections";
import type { RecipeSection, Step } from "@/lib/db/schema";

interface InstructionsListProps {
  instructions: Step[];
  sections?: RecipeSection[];
}

export function InstructionsList({
  instructions,
  sections,
}: InstructionsListProps) {
  const t = useTranslations("recipes");

  const sorted = [...instructions].sort((a, b) => a.order - b.order);
  const groups = groupBySectionRuns(sorted);
  const showSections = shouldShowSections(
    instructions.map((step) => step.sectionId),
  );

  return (
    <div className="mb-8">
      <h2 className="mb-3 font-[family-name:var(--font-display)] text-[15px] font-bold text-[var(--fg-1)]">
        {t("instructions")}
      </h2>
      <div className="flex flex-col gap-[10px]">
        {groups.map((group, groupIndex) => {
          const name = sectionName(group.sectionId, sections);
          return (
            // `groupBySectionRuns` can emit the same sectionId in more than one
            // run, so key on the run's first step id (unique per run) rather
            // than sectionId.
            <div
              key={group.items[0]?.id ?? `group-${groupIndex}`}
              className="flex flex-col gap-[10px]"
            >
              {showSections && name && (
                <div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--fg-2)]">
                  {name}
                </div>
              )}
              {group.items.map((step) => (
                <div
                  key={step.id || `step-${step.order}`}
                  className="glass-card rounded-[16px] p-[12px_14px] flex gap-3 items-start"
                >
                  <div className="w-[22px] h-[22px] rounded-full shrink-0 bg-[linear-gradient(135deg,#3b82f6,#8b5cf6)] text-white text-[11px] font-bold flex items-center justify-center">
                    {step.order}
                  </div>
                  <div className="flex-1">
                    {step.imageUrl && (
                      <div className="relative w-full overflow-hidden mb-2 h-[160px] rounded-[10px]">
                        <RecipeImage
                          imageUrl={step.imageUrl}
                          title={`Step ${step.order}`}
                          width={600}
                        />
                      </div>
                    )}
                    <p className="text-[13px] text-[var(--fg-1)] leading-[1.55]">
                      {step.instruction}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
