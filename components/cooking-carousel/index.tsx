"use client";

import { XIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import type { Recipe } from "@/lib/db/schema";
import { trackEvent } from "@/lib/telemetry";
import { CookingNavBar } from "./cooking-nav-bar";
import { IngredientsSheet } from "./ingredients-sheet";
import { OverviewSlide } from "./overview-slide";
import { StepSlide } from "./step-slide";

interface CookingCarouselProps {
  recipe: Recipe;
  locale: string;
  onClose: () => void;
}

export function CookingCarousel({
  recipe,
  locale,
  onClose,
}: CookingCarouselProps) {
  const [ingredientsOpen, setIngredientsOpen] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [api, setApiState] = useState<CarouselApi | null>(null);

  const setApi = useCallback((carouselApi: CarouselApi) => {
    if (!carouselApi) return;
    setApiState(carouselApi);
    carouselApi.on("select", () => {
      setCurrentSlide(carouselApi.selectedScrollSnap());
    });
  }, []);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    trackEvent("step_images_viewed", undefined);
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const isLastStep = currentSlide === recipe.instructions.length;
  const dotKeys = ["overview", ...recipe.instructions.map((step) => step.id)];

  const handleNext = () => {
    if (isLastStep) {
      onClose();
    } else {
      api?.scrollTo(currentSlide + 1);
    }
  };

  // Portal to document.body so fixed positioning is relative to the viewport,
  // not the PageStack entry which has willChange:transform as a containing block.
  return createPortal(
    <div className="fixed inset-0 z-[300] bg-[rgba(6,4,2,0.97)] flex flex-col">
      {/* Header — absolute positioned above carousel */}
      <div className="absolute top-0 left-0 right-0 z-10 flex justify-between items-center px-[14px] pt-[max(20px,calc(env(safe-area-inset-top)+8px))] pb-2">
        <span className="font-display text-[17px] font-bold text-[var(--fg-1)]">
          Cooking
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close cooking mode"
          className="bg-[rgba(0,0,0,0.38)] backdrop-blur-[16px] border border-white/[0.15] rounded-full py-[7px] px-3 text-white/90 cursor-pointer text-xs font-medium flex items-center justify-center"
        >
          <XIcon className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Carousel */}
      <div className="flex-1 overflow-hidden pt-[55px]">
        <Carousel className="h-full" setApi={setApi}>
          <CarouselContent
            className="-ml-4"
            style={{ height: "calc(100vh - 76px - 52px)" }}
          >
            <CarouselItem className="pl-4 h-full">
              <OverviewSlide recipe={recipe} locale={locale} />
            </CarouselItem>

            {recipe.instructions.map((step) => (
              <CarouselItem key={step.id} className="pl-4 h-full">
                <StepSlide
                  step={step}
                  totalSteps={recipe.instructions.length}
                />
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
      </div>

      <CookingNavBar
        currentSlide={currentSlide}
        dotKeys={dotKeys}
        isLastStep={isLastStep}
        onDotClick={(index) => api?.scrollTo(index)}
        onPrev={() => api?.scrollTo(currentSlide - 1)}
        onNext={handleNext}
        onOpenIngredients={() => setIngredientsOpen(true)}
      />

      {ingredientsOpen && (
        <IngredientsSheet
          recipe={recipe}
          locale={locale}
          onClose={() => setIngredientsOpen(false)}
        />
      )}
    </div>,
    document.body,
  );
}
