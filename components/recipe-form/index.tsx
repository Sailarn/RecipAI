"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { createRecipe, updateRecipe } from "@/lib/db/recipes";
import type { Recipe } from "@/lib/db/schema";
import { deleteImage, isImageKitUrl, uploadImage } from "@/lib/images";
import { routes } from "@/lib/routes";
import { useNavigate } from "@/lib/transitions";
import { BasicInfo } from "./basic-info";
import { getDefaultValues, type ParsedRecipeData } from "./default-values";
import { IngredientsSection } from "./ingredients-section";
import { InstructionsSection } from "./instructions-section";
import {
  createRecipeSchema,
  type RecipeFormData,
  type RecipeOutput,
} from "./schema";

interface RecipeFormProps {
  recipe?: Recipe;
  initialData?: ParsedRecipeData;
}

type TabKey = "info" | "ingredients" | "steps";

const TAB_KEYS: TabKey[] = ["info", "ingredients", "steps"];

export function RecipeForm({ recipe, initialData }: RecipeFormProps) {
  const navigate = useNavigate();
  const params = useParams();
  const [imageError, setImageError] = useState<string | null>(null);
  const pendingImageFile = useRef<File | null>(null);
  const pendingStepFiles = useRef<Record<number, File>>({});
  const locale = params.locale as string;
  const t = useTranslations("recipeForm");
  const recipeSchema = createRecipeSchema(t);

  const [activeTab, setActiveTab] = useState<TabKey>("info");
  const [validatedTabs, setValidatedTabs] = useState<
    Record<TabKey, "valid" | "error" | "untouched">
  >({
    info: "untouched",
    ingredients: "untouched",
    steps: "untouched",
  });
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">(
    "idle",
  );

  const {
    register,
    control,
    handleSubmit,
    trigger,
    formState: { errors },
  } = useForm<RecipeFormData>({
    // biome-ignore lint/suspicious/noExplicitAny: zodResolver type conflict with transforms
    resolver: zodResolver(recipeSchema) as any,
    mode: "onSubmit",
    defaultValues: getDefaultValues(recipe, initialData),
  });

  const activeTabIndex = TAB_KEYS.indexOf(activeTab);

  const handleTabClick = async (tab: TabKey) => {
    // If moving forward, validate current tab first
    const currentIdx = TAB_KEYS.indexOf(activeTab);
    const targetIdx = TAB_KEYS.indexOf(tab);

    if (targetIdx > currentIdx) {
      // Validate current tab fields
      let isValid = false;
      if (activeTab === "info") {
        isValid = await trigger(["title", "servings"]);
      } else if (activeTab === "ingredients") {
        isValid = await trigger("ingredients");
      } else {
        isValid = true;
      }

      if (!isValid) {
        setValidatedTabs((prev) => ({
          ...prev,
          [activeTab]: "error",
        }));
        return;
      }

      setValidatedTabs((prev) => ({
        ...prev,
        [activeTab]: "valid",
      }));
    }

    setActiveTab(tab);
  };

  const handleNext = async () => {
    const nextIdx = activeTabIndex + 1;
    if (nextIdx >= TAB_KEYS.length) return;

    // Validate current tab
    let isValid = false;
    if (activeTab === "info") {
      isValid = await trigger(["title", "servings"]);
    } else if (activeTab === "ingredients") {
      isValid = await trigger("ingredients");
    } else {
      isValid = true;
    }

    if (!isValid) {
      setValidatedTabs((prev) => ({
        ...prev,
        [activeTab]: "error",
      }));
      return;
    }

    setValidatedTabs((prev) => ({
      ...prev,
      [activeTab]: "valid",
    }));
    setActiveTab(TAB_KEYS[nextIdx]);
  };

  const handleBack = () => {
    const prevIdx = activeTabIndex - 1;
    if (prevIdx < 0) return;
    setActiveTab(TAB_KEYS[prevIdx]);
  };

  const onSubmit = async (data: RecipeOutput) => {
    setImageError(null);
    setSaveState("saving");

    const totalTime = (data.prepTime || 0) + (data.cookTime || 0) || undefined;

    // build instructions without waiting for uploads
    const instructions = (data.instructions || []).map((inst, idx) => ({
      id: crypto.randomUUID(),
      order: idx + 1,
      instruction: inst.instruction,
      imageUrl: inst.imageUrl || undefined,
    }));

    const recipeData = {
      ...data,
      imageUrl: data.imageUrl || "",
      imageFileId: recipe?.imageFileId,
      totalTime,
      ingredients: data.ingredients.map((ing) => ({
        id: crypto.randomUUID(),
        ...ing,
      })),
      instructions,
    };

    let savedId: string;
    try {
      if (recipe) {
        await updateRecipe(recipe.id, recipeData);
        savedId = recipe.id;
      } else {
        savedId = await createRecipe(recipeData);
      }
    } catch {
      setSaveState("idle");
      setImageError("Failed to save recipe");
      return;
    }

    setSaveState("saved");

    // Navigate after brief delay to show saved state
    setTimeout(() => {
      navigate.push(routes.recipes.list(locale));
    }, 600);

    // upload images in background after navigation
    (async () => {
      const updates: Partial<typeof recipeData> = {};
      let hasUpdates = false;

      // main image
      const file = pendingImageFile.current;
      if (file) {
        try {
          if (recipe?.imageFileId) await deleteImage(recipe.imageFileId);
          const uploaded = await uploadImage(file);
          updates.imageUrl = uploaded.url;
          updates.imageFileId = uploaded.fileId;
          hasUpdates = true;
        } catch {
          // silent
        }
      } else if (recipeData.imageUrl && !isImageKitUrl(recipeData.imageUrl)) {
        try {
          if (recipe?.imageFileId) await deleteImage(recipe.imageFileId);
          const uploaded = await uploadImage(recipeData.imageUrl);
          updates.imageUrl = uploaded.url;
          updates.imageFileId = uploaded.fileId;
          hasUpdates = true;
        } catch {
          // silent
        }
      }

      // step images
      const updatedInstructions = [];
      for (const inst of instructions) {
        const idx = inst.order - 1;
        const stepFile = pendingStepFiles.current[idx];
        if (stepFile) {
          try {
            const uploaded = await uploadImage(stepFile);
            hasUpdates = true;
            updatedInstructions.push({ ...inst, imageUrl: uploaded.url });
          } catch {
            updatedInstructions.push(inst);
          }
        } else if (inst.imageUrl && !isImageKitUrl(inst.imageUrl)) {
          try {
            const uploaded = await uploadImage(inst.imageUrl);
            hasUpdates = true;
            updatedInstructions.push({ ...inst, imageUrl: uploaded.url });
          } catch {
            updatedInstructions.push(inst);
          }
        } else {
          updatedInstructions.push(inst);
        }
      }

      if (hasUpdates) {
        updates.instructions = updatedInstructions;
        await updateRecipe(savedId, updates);
      }
    })();
  };

  const getTabStyle = (tab: TabKey) => {
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

    // untouched inactive
    return {
      background: "rgba(255,170,50,0.07)",
      border: "1px solid rgba(255,200,100,0.14)",
      color: "var(--fg-3)",
      fontWeight: 500,
    };
  };

  const getTabPrefix = (tab: TabKey) => {
    const status = validatedTabs[tab];
    if (status === "valid") return "✓ ";
    if (status === "error") return "✕ ";
    return "";
  };

  const tabLabels: Record<TabKey, string> = {
    info: t("tabInfo"),
    ingredients: t("tabIngredients"),
    steps: t("tabSteps"),
  };

  const progressPercent = ((activeTabIndex + 1) / TAB_KEYS.length) * 100;

  return (
    <div
      style={{
        height: "100dvh",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* Header */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          padding: "max(16px, env(safe-area-inset-top, 16px)) 16px 0",
          flexShrink: 0,
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
            onClick={() => navigate.back()}
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
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ color: "var(--fg-2)" }}
              aria-hidden="true"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
            {recipe ? t("editTitle") : t("createTitle")}
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
              onClick={() => handleTabClick(tab)}
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

      {/* Scrollable Tab Content */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          padding: "16px 16px 80px",
        }}
      >
        {/* biome-ignore lint/suspicious/noExplicitAny: zodResolver type conflict with transforms */}
        <form onSubmit={handleSubmit(onSubmit as any)}>
          {activeTab === "info" && (
            <BasicInfo
              register={register}
              control={control}
              errors={errors}
              onFileSelect={(file) => {
                pendingImageFile.current = file;
              }}
            />
          )}

          {activeTab === "ingredients" && (
            <IngredientsSection
              register={register}
              control={control}
              errors={errors}
            />
          )}

          {activeTab === "steps" && (
            <InstructionsSection
              register={register}
              control={control}
              errors={errors}
              onStepFileSelect={(index, file) => {
                if (file) pendingStepFiles.current[index] = file;
                else delete pendingStepFiles.current[index];
              }}
            />
          )}

          {imageError && (
            <Alert variant="destructive">
              <AlertDescription>{imageError}</AlertDescription>
            </Alert>
          )}
        </form>
      </div>

      {/* Bottom Action Bar */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 80,
          padding: "12px 16px",
          paddingBottom: "max(28px, env(safe-area-inset-bottom, 28px))",
          background: "rgba(8,8,8,0.85)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          borderTop: "1px solid rgba(255,200,100,0.12)",
          zIndex: 10,
          display: "flex",
          alignItems: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 10,
            width: "100%",
          }}
        >
          {activeTabIndex > 0 && (
            <button
              type="button"
              onClick={handleBack}
              disabled={saveState === "saving"}
              style={{
                flex: 1,
                padding: 13,
                borderRadius: 16,
                border: "1px solid rgba(255,200,100,0.20)",
                background: "rgba(255,170,50,0.08)",
                color: "var(--fg-1)",
                fontSize: 14,
                fontWeight: 600,
                fontFamily: "var(--font-sans)",
                lineHeight: 1,
                cursor: "pointer",
                transition: "all 0.15s ease",
                opacity: saveState === "saving" ? 0.5 : 1,
              }}
            >
              {t("back")}
            </button>
          )}

          {activeTabIndex < TAB_KEYS.length - 1 ? (
            <button
              type="button"
              onClick={handleNext}
              style={{
                flex: activeTabIndex === 0 ? "0 1 auto" : 2,
                padding: "13px 32px",
                borderRadius: 16,
                maxHeight: 43,
                border: "none",
                width: "100%",
                background: "var(--action-primary)",
                color: "#fff",
                fontSize: 14,
                fontWeight: 700,
                fontFamily: "var(--font-sans)",
                lineHeight: 1,
                boxShadow: "0 4px 18px rgba(59,130,246,0.45)",
                cursor: "pointer",
                transition: "all 0.15s ease",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
              }}
            >
              {t("next")}
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ flexShrink: 0 }}
                aria-hidden="true"
              >
                <path d="m9 18 6-6-6-6" />
              </svg>
            </button>
          ) : (
            <button
              type="button"
              // biome-ignore lint/suspicious/noExplicitAny: zodResolver type conflict with transforms
              onClick={handleSubmit(onSubmit as any)}
              disabled={saveState === "saving"}
              style={{
                flex: activeTabIndex === 0 ? "0 1 auto" : 2,
                padding: "13px 32px",
                borderRadius: 16,
                maxHeight: 43,
                border: "none",
                width: "100%",
                fontSize: 14,
                fontWeight: 700,
                fontFamily: "var(--font-sans)",
                lineHeight: 1,
                cursor: saveState === "saving" ? "not-allowed" : "pointer",
                transition: "all 0.3s ease",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                ...(saveState === "saved"
                  ? {
                      background: "rgba(74,222,128,0.70)",
                      boxShadow: "0 4px 18px rgba(74,222,128,0.45)",
                      color: "#fff",
                    }
                  : {
                      background: "var(--action-primary)",
                      boxShadow: "0 4px 18px rgba(59,130,246,0.45)",
                      color: "#fff",
                    }),
                opacity: saveState === "saving" ? 0.6 : 1,
              }}
            >
              {saveState === "saved"
                ? "✓ Saved!"
                : saveState === "saving"
                  ? "Saving..."
                  : recipe
                    ? "Save"
                    : "Create"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
