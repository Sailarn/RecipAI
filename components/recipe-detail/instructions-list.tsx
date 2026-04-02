"use client";

import { useTranslations } from "next-intl";
import { RecipeImage } from "@/components/recipe-image";
import { Separator } from "@/components/ui/separator";
import type { Step } from "@/lib/db/schema";

interface InstructionsListProps {
  instructions: Step[];
}

export function InstructionsList({ instructions }: InstructionsListProps) {
  const t = useTranslations("recipes");

  return (
    <div className="mb-8">
      <h2 className="text-2xl font-semibold mb-4">{t("instructions")}</h2>
      <Separator className="mb-4" />
      <ol className="space-y-6">
        {instructions
          .sort((a, b) => a.order - b.order)
          .map((step) => (
            <li key={step.id} className="flex gap-3">
              <span className="font-semibold text-primary min-w-[20px] mt-1">
                {step.order}.
              </span>
              <div className="flex-1 space-y-2">
                {step.imageUrl && (
                  <div className="relative w-full h-40 rounded-lg overflow-hidden">
                    <RecipeImage
                      imageUrl={step.imageUrl}
                      title={`Step ${step.order}`}
                      width={600}
                      height={160}
                      sizes="(max-width: 768px) 100vw, 600px"
                    />
                  </div>
                )}
                <span>{step.instruction}</span>
              </div>
            </li>
          ))}
      </ol>
    </div>
  );
}
