"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { Locale } from "@/i18n/config";
import type { Recipe } from "@/lib/db/schema";
import { routes } from "@/lib/routes";
import { useNavigate } from "@/lib/transitions";
import { BasicInfo } from "./basic-info";
import { getDefaultValues, type ParsedRecipeData } from "./default-values";
import { FormActionBar } from "./form-action-bar";
import { FormHeader } from "./form-header";
import { IngredientsSection } from "./ingredients-section";
import { InstructionsSection } from "./instructions-section";
import {
  createRecipeSchema,
  type RecipeFormData,
  type RecipeOutput,
} from "./schema";
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
  const { locale = "en" } = useParams<{ locale: Locale }>();

  const handleFormBack = () => navigate.back(routes.recipes.list(locale));
  const recipeSchema = createRecipeSchema(t);
  const defaultValues = useMemo(
    () => getDefaultValues(recipe, initialData),
    [initialData, recipe],
  );

  const {
    register,
    control,
    handleSubmit,
    trigger,
    watch,
    setValue,
    formState: { errors },
    // The third generic is what makes the transform typecheck: the form holds
    // RecipeFormData (servings as a string from the input), the resolver hands
    // handleSubmit the parsed RecipeOutput. Without it react-hook-form assumes
    // input and output are the same shape and both the resolver and every
    // handleSubmit call need casting.
  } = useForm<RecipeFormData, unknown, RecipeOutput>({
    resolver: zodResolver(recipeSchema),
    mode: "onSubmit",
    defaultValues,
  });

  const {
    activeTab,
    activeTabIndex,
    handleTabClick,
    handleNext,
    handleBack,
    getTabClassName,
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
    <div className="absolute inset-0 flex flex-col overflow-hidden">
      <FormHeader
        backLabel={recipe ? t("editTitle") : t("createTitle")}
        onBack={handleFormBack}
        activeTab={activeTab}
        activeTabIndex={activeTabIndex}
        tabLabels={tabLabels}
        onTabClick={handleTabClick}
        getTabClassName={getTabClassName}
        getTabPrefix={getTabPrefix}
      />

      {/* Scrollable Tab Content */}
      <div
        ref={scrollRef}
        className="relative z-[1] flex-1 min-h-0 overscroll-contain [-webkit-overflow-scrolling:touch] p-4"
        style={{ overflowY: needsScroll ? "auto" : "hidden" }}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="overflow-hidden">
          <div hidden={activeTab !== "info"}>
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
              onCropChange={(crop) => {
                setValue("imageCropX", crop?.x);
                setValue("imageCropY", crop?.y);
                setValue("imageCropWidth", crop?.w);
                setValue("imageCropHeight", crop?.h);
              }}
            />
          </div>

          <div hidden={activeTab !== "ingredients"}>
            <IngredientsSection
              register={register}
              control={control}
              errors={errors}
              setValue={setValue}
              locale={locale}
              canonicalIngredientIds={recipe?.canonicalIngredientIds}
            />
          </div>

          <div hidden={activeTab !== "steps"}>
            <InstructionsSection
              register={register}
              control={control}
              errors={errors}
              setValue={setValue}
              onStepFileSelect={(stepId, file) => {
                if (file) pendingStepFiles.current[stepId] = file;
                else delete pendingStepFiles.current[stepId];
              }}
            />
          </div>

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
        onSave={handleSubmit(onSubmit)}
      />
    </div>
  );
}
