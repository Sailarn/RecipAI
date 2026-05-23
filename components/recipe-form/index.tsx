"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { Recipe } from "@/lib/db/schema";
import { routes } from "@/lib/routes";
import { useNavigate } from "@/lib/transitions";
import { BasicInfo } from "./basic-info";
import { getDefaultValues, type ParsedRecipeData } from "./default-values";
import { FormActionBar } from "./form-action-bar";
import { FormHeader } from "./form-header";
import { IngredientsSection } from "./ingredients-section";
import { InstructionsSection } from "./instructions-section";
import { createRecipeSchema, type RecipeFormData } from "./schema";
import { useRecipeSave } from "./use-recipe-save";
import { useScrollOverflow } from "./use-scroll-overflow";
import { useTabNavigation } from "./use-tab-navigation";

interface RecipeFormProps {
  recipe?: Recipe;
  initialData?: ParsedRecipeData;
}

export function RecipeForm({ recipe, initialData }: RecipeFormProps) {
  const t = useTranslations("recipeForm");
  const navigate = useNavigate();
  const params = useParams();
  const locale = (params.locale as string) ?? "en";

  const handleFormBack = () => navigate.back(routes.recipes.list(locale));
  const recipeSchema = createRecipeSchema(t);

  const {
    register,
    control,
    handleSubmit,
    trigger,
    watch,
    setValue,
    formState: { errors },
  } = useForm<RecipeFormData>({
    // biome-ignore lint/suspicious/noExplicitAny: zodResolver type conflict with transforms
    resolver: zodResolver(recipeSchema) as any,
    mode: "onSubmit",
    defaultValues: getDefaultValues(recipe, initialData),
  });

  const {
    activeTab,
    activeTabIndex,
    handleTabClick,
    handleNext,
    handleBack,
    getTabStyle,
    getTabPrefix,
  } = useTabNavigation(trigger);

  const { scrollRef, needsScroll } = useScrollOverflow(activeTab);

  const {
    imageError,
    saveState,
    pendingImageFile,
    pendingStepFiles,
    onSubmit,
  } = useRecipeSave(recipe);

  const tabLabels = {
    info: t("tabInfo"),
    ingredients: t("tabIngredients"),
    steps: t("tabSteps"),
  };

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <FormHeader
        backLabel={recipe ? t("editTitle") : t("createTitle")}
        onBack={handleFormBack}
        activeTab={activeTab}
        activeTabIndex={activeTabIndex}
        tabLabels={tabLabels}
        onTabClick={handleTabClick}
        getTabStyle={getTabStyle}
        getTabPrefix={getTabPrefix}
      />

      {/* Scrollable Tab Content */}
      <div
        ref={scrollRef}
        style={{
          position: "relative",
          zIndex: 1,
          flex: 1,
          minHeight: 0,
          overflowY: needsScroll ? "auto" : "hidden",
          overscrollBehavior: "contain",
          WebkitOverflowScrolling: "touch",
          padding: "16px",
        }}
      >
        <form
          // biome-ignore lint/suspicious/noExplicitAny: zodResolver type conflict with transforms
          onSubmit={handleSubmit(onSubmit as any)}
          style={{ overflow: "hidden" }}
        >
          {activeTab === "info" && (
            <BasicInfo
              register={register}
              control={control}
              errors={errors}
              onFileSelect={(file) => {
                pendingImageFile.current = file;
              }}
              focusX={watch("imageFocusX") ?? 50}
              focusY={watch("imageFocusY") ?? 50}
              onFocusChange={(x, y) => {
                setValue("imageFocusX", x);
                setValue("imageFocusY", y);
              }}
              crop={
                watch("imageCropWidth") != null
                  ? {
                      x: watch("imageCropX") ?? 0,
                      y: watch("imageCropY") ?? 0,
                      w: watch("imageCropWidth") ?? 100,
                      h: watch("imageCropHeight") ?? 100,
                    }
                  : null
              }
              onCropChange={(c) => {
                setValue("imageCropX", c?.x);
                setValue("imageCropY", c?.y);
                setValue("imageCropWidth", c?.w);
                setValue("imageCropHeight", c?.h);
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

      <FormActionBar
        activeTabIndex={activeTabIndex}
        saveState={saveState}
        isEditMode={!!recipe}
        backLabel={t("back")}
        nextLabel={t("next")}
        onBack={handleBack}
        onNext={handleNext}
        // biome-ignore lint/suspicious/noExplicitAny: zodResolver type conflict with transforms
        onSave={handleSubmit(onSubmit as any)}
      />
    </div>
  );
}
