"use client";
import { useTranslations } from "next-intl";
import type { Step } from "@/lib/db/schema";

interface InstructionsListProps {
  instructions: Step[];
}

export function InstructionsList({ instructions }: InstructionsListProps) {
  const t = useTranslations("recipes");

  return (
    <div className="mb-8">
      <h2 className="text-2xl font-semibold mb-4">{t("instructions")}</h2>
      <ol className="space-y-4">
        {instructions
          .sort((a, b) => a.order - b.order)
          .map((step) => (
            <li key={step.id} className="flex gap-3">
              <span className="font-semibold text-blue-600 dark:text-blue-400">
                {step.order}.
              </span>
              <span>{step.instruction}</span>
            </li>
          ))}
      </ol>
    </div>
  );
}
