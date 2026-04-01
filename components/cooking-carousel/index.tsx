"use client";

import { BookOpenIcon, XIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { RecipeImage } from "@/components/recipe-image";
import { ServingsCalculator } from "@/components/servings-calculator";
import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { Recipe } from "@/lib/db/schema";

interface CookingCarouselProps {
  recipe: Recipe;
  onClose: () => void;
}

export function CookingCarousel({ recipe, onClose }: CookingCarouselProps) {
  const [ingredientsOpen, setIngredientsOpen] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const totalSlides = 1 + recipe.instructions.length;

  const setApi = useCallback((api: CarouselApi) => {
    if (!api) return;
    api.on("select", () => {
      setCurrentSlide(api.selectedScrollSnap());
    });
  }, []);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <span className="text-sm text-muted-foreground">
          {currentSlide === 0
            ? "Overview"
            : `Step ${currentSlide} of ${recipe.instructions.length}`}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-full hover:bg-muted transition-colors"
        >
          <XIcon className="w-5 h-5" />
        </button>
      </div>

      {/* Carousel */}
      <div className="flex-1 overflow-hidden">
        <Carousel className="h-full" setApi={setApi}>
          <CarouselContent className="h-full">
            {/* Slide 1 — Overview */}
            <CarouselItem className="h-full overflow-y-auto">
              <div className="p-4 space-y-4">
                <div className="relative w-full h-48 rounded-xl overflow-hidden">
                  <RecipeImage
                    imageUrl={recipe.imageUrl}
                    title={recipe.title}
                    width={800}
                    height={192}
                  />
                </div>
                <h1 className="text-2xl font-bold">{recipe.title}</h1>
                {recipe.description && (
                  <p className="text-sm text-muted-foreground">
                    {recipe.description}
                  </p>
                )}
                <ServingsCalculator
                  originalServings={recipe.servings}
                  ingredients={recipe.ingredients}
                />
              </div>
            </CarouselItem>

            {/* Step slides */}
            {recipe.instructions.map((step, idx) => (
              <CarouselItem key={step.id} className="h-full overflow-y-auto">
                <div className="p-4 space-y-4">
                  <div className="relative w-full h-48 rounded-xl overflow-hidden">
                    <RecipeImage
                      imageUrl={step.imageUrl}
                      title={`Step ${step.order}`}
                      width={800}
                      height={192}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary text-primary-foreground">
                      {step.order}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      of {recipe.instructions.length}
                    </span>
                  </div>
                  <p className="text-base leading-relaxed">
                    {step.instruction}
                  </p>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
      </div>

      {/* Bottom bar */}
      <div className="px-4 py-3 border-t flex items-center justify-between">
        <button
          type="button"
          onClick={() => setIngredientsOpen(true)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <BookOpenIcon className="w-4 h-4" />
          Ingredients
        </button>

        {/* Progress dots */}
        {["overview", ...recipe.instructions.map((s) => s.id)].map((key, i) => (
          <div
            key={key}
            className={`w-1.5 h-1.5 rounded-full transition-colors ${
              i === currentSlide ? "bg-primary" : "bg-muted"
            }`}
          />
        ))}

        <div className="w-20" />
      </div>

      {/* Ingredients sheet */}
      <Sheet open={ingredientsOpen} onOpenChange={setIngredientsOpen}>
        <SheetContent
          side="bottom"
          className="max-h-[70vh] overflow-y-auto rounded-t-2xl"
        >
          <SheetHeader className="px-4 pt-4 pb-0">
            <SheetTitle>Ingredients</SheetTitle>
          </SheetHeader>
          <div className="px-4 pb-6">
            <ServingsCalculator
              originalServings={recipe.servings}
              ingredients={recipe.ingredients}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
