"use client";

import { useTranslations } from "next-intl";
import { RecipeImage } from "@/components/recipe-image";
import type { Step } from "@/lib/db/schema";

interface InstructionsListProps {
  instructions: Step[];
}

export function InstructionsList({ instructions }: InstructionsListProps) {
  const t = useTranslations("recipes");

  return (
    <div className="mb-8">
      <h2
        className="mb-3"
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 15,
          fontWeight: 700,
          color: "var(--fg-1)",
        }}
      >
        {t("instructions")}
      </h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {instructions
          .sort((a, b) => a.order - b.order)
          .map((step) => (
            <div
              key={step.id || `step-${step.order}`}
              className="glass-card"
              style={{
                borderRadius: 16,
                padding: "12px 14px",
                display: "flex",
                gap: 12,
                alignItems: "flex-start",
              }}
            >
              <div
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 11,
                  flexShrink: 0,
                  background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
                  color: "#fff",
                  fontSize: 11,
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {step.order}
              </div>
              <div style={{ flex: 1 }}>
                {step.imageUrl && (
                  <div
                    className="relative w-full overflow-hidden mb-2"
                    style={{ height: 160, borderRadius: 10 }}
                  >
                    <RecipeImage
                      imageUrl={step.imageUrl}
                      title={`Step ${step.order}`}
                      width={600}
                      height={160}
                      sizes="(max-width: 768px) 100vw, 600px"
                    />
                  </div>
                )}
                <p
                  style={{
                    fontSize: 13,
                    color: "var(--fg-1)",
                    lineHeight: 1.55,
                  }}
                >
                  {step.instruction}
                </p>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
