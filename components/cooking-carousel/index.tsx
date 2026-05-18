"use client";

import { BookOpenIcon, ChevronLeft, ChevronRight, XIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { IngredientsList } from "@/components/recipe-detail/ingredients-list";
import { RecipeImage } from "@/components/recipe-image";
import { ServingsCalculator } from "@/components/servings-calculator";
import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import type { Recipe } from "@/lib/db/schema";

interface CookingCarouselProps {
  recipe: Recipe;
  onClose: () => void;
}

export function CookingCarousel({ recipe, onClose }: CookingCarouselProps) {
  const [ingredientsOpen, setIngredientsOpen] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [api, setApiState] = useState<CarouselApi | null>(null);

  const setApi = useCallback((api: CarouselApi) => {
    if (!api) return;
    setApiState(api);
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

  const isLastStep = currentSlide === recipe.instructions.length;

  // Portal to document.body so fixed positioning is relative to the viewport,
  // not the PageStack entry which has willChange:transform as a containing block.
  return createPortal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 300,
        background: "rgba(6,4,2,0.97)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header — absolute positioned above carousel */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 10,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "max(20px, calc(env(safe-area-inset-top) + 8px)) 14px 8px",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 17,
            fontWeight: 700,
            color: "var(--fg-1)",
          }}
        >
          Cooking
        </span>
        <button
          type="button"
          onClick={onClose}
          style={{
            background: "rgba(0,0,0,0.38)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            border: "1px solid rgba(255,255,255,0.15)",
            borderRadius: 99,
            padding: "7px 12px",
            color: "rgba(255,255,255,0.90)",
            cursor: "pointer",
            fontSize: 12,
            fontWeight: 500,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <XIcon style={{ width: 14, height: 14 }} />
        </button>
      </div>

      {/* Carousel */}
      <div style={{ flex: 1, overflow: "hidden", paddingTop: 55 }}>
        <Carousel className="h-full" setApi={setApi}>
          <CarouselContent
            className="-ml-4"
            style={{ height: "calc(100vh - 76px - 52px)" }}
          >
            {/* Slide 0 — Overview */}
            <CarouselItem className="pl-4 h-full">
              <div
                style={{
                  padding: "0 14px",
                  overflowY: "auto",
                  height: "100%",
                }}
                onTouchStart={(e) => e.stopPropagation()}
                onTouchMove={(e) => e.stopPropagation()}
              >
                <h1
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 22,
                    fontWeight: 800,
                    color: "var(--fg-1)",
                    marginBottom: 4,
                  }}
                >
                  {recipe.title}
                </h1>
                {recipe.description && (
                  <p
                    style={{
                      fontSize: 12,
                      color: "var(--fg-2)",
                      marginBottom: 16,
                    }}
                  >
                    {recipe.description}
                  </p>
                )}
                {/* Hero image */}
                {recipe.imageUrl && (
                  <div
                    style={{
                      position: "relative",
                      width: "100%",
                      height: 190,
                      borderRadius: 16,
                      overflow: "hidden",
                      marginBottom: 12,
                    }}
                  >
                    <RecipeImage
                      imageUrl={recipe.imageUrl}
                      title={recipe.title}
                      width={800}
                      objectPosition={`${recipe.imageFocusX ?? 50}% ${recipe.imageFocusY ?? 50}%`}
                      imageCropX={recipe.imageCropX}
                      imageCropY={recipe.imageCropY}
                      imageCropWidth={recipe.imageCropWidth}
                      imageCropHeight={recipe.imageCropHeight}
                    />
                    {/* Gradient overlay */}
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        background:
                          "linear-gradient(to top, rgba(6,4,2,0.97) 0%, transparent 60%)",
                      }}
                    />
                  </div>
                )}
                <IngredientsList ingredients={recipe.ingredients} />
              </div>
            </CarouselItem>

            {/* Step slides */}
            {recipe.instructions.map((step) => (
              <CarouselItem key={step.id} className="pl-4 h-full">
                <div
                  style={{
                    padding: "0 14px 20px",
                    overflowY: "auto",
                    height: "100%",
                  }}
                >
                  {/* Hero image container */}
                  <div
                    style={{
                      position: "relative",
                      width: "100%",
                      height: 190,
                      borderRadius: 16,
                      overflow: "hidden",
                      marginBottom: 12,
                    }}
                  >
                    <RecipeImage
                      imageUrl={step.imageUrl}
                      title={`Step ${step.order}`}
                      width={800}
                    />
                    {/* Gradient overlay */}
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        background:
                          "linear-gradient(to top, rgba(6,4,2,0.97) 0%, transparent 60%)",
                      }}
                    />
                    {/* Step badge */}
                    <div
                      style={{
                        position: "absolute",
                        bottom: 8,
                        left: 8,
                        padding: "4px 8px",
                        background: "rgba(0,0,0,0.38)",
                        backdropFilter: "blur(16px)",
                        WebkitBackdropFilter: "blur(16px)",
                        borderRadius: 99,
                        fontSize: 10,
                        fontWeight: 500,
                        color: "#fff",
                      }}
                    >
                      Step {step.order}/{recipe.instructions.length}
                    </div>
                  </div>
                  {/* Instruction text */}
                  <p
                    style={{
                      fontSize: 13,
                      color: "var(--fg-1)",
                      lineHeight: 1.6,
                      padding: "0 4px",
                    }}
                  >
                    {step.instruction}
                  </p>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
      </div>

      {/* Bottom Navigation Bar */}
      <div
        style={{
          background: "rgba(6,4,2,0.85)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          padding: "8px 14px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexShrink: 0,
        }}
      >
        {/* Left section — Ingredients toggle (step slides only) */}
        {currentSlide > 0 ? (
          <button
            type="button"
            onClick={() => setIngredientsOpen(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "rgba(255,255,255,0.08)",
              borderRadius: 99,
              padding: "7px 12px",
              cursor: "pointer",
              border: "none",
            }}
          >
            <BookOpenIcon
              style={{ width: 14, height: 14, color: "var(--fg-2)" }}
            />
            <span
              style={{
                fontSize: 11,
                fontWeight: 500,
                color: "var(--fg-2)",
              }}
            >
              Ingredients
            </span>
          </button>
        ) : (
          <div style={{ width: 80 }} />
        )}

        {/* Center section — Dot pagination */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          {["overview", ...recipe.instructions.map((s) => s.id)].map(
            (key, i) => (
              <button
                type="button"
                key={key}
                onClick={() => api?.scrollTo(i)}
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                  background:
                    i === currentSlide
                      ? "var(--food-accent)"
                      : "rgba(255,255,255,0.15)",
                }}
              />
            ),
          )}
        </div>

        {/* Right section — Prev / Next / Done buttons */}
        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
          }}
        >
          {/* Prev button (step slides only) */}
          {currentSlide > 0 && (
            <button
              type="button"
              onClick={() => api?.scrollTo(currentSlide - 1)}
              style={{
                width: 36,
                height: 36,
                borderRadius: 99,
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.12)",
                color: "var(--fg-2)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ChevronLeft style={{ width: 16, height: 16 }} />
            </button>
          )}

          {/* Next / Done button */}
          <button
            type="button"
            onClick={() => {
              if (isLastStep) {
                onClose();
              } else {
                api?.scrollTo(currentSlide + 1);
              }
            }}
            style={{
              height: 36,
              borderRadius: 99,
              border: "none",
              cursor: "pointer",
              padding: "0 16px",
              fontSize: 13,
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: isLastStep
                ? "var(--food-accent)"
                : "var(--action-primary)",
              color: "#fff",
            }}
          >
            {isLastStep ? "Done" : "Next"}
            {!isLastStep && <ChevronRight style={{ width: 14, height: 14 }} />}
          </button>
        </div>
      </div>

      {/* Custom Ingredients Bottom Sheet (not shadcn Sheet) */}
      {ingredientsOpen &&
        createPortal(
          <>
            {/* Overlay backdrop */}
            <button
              type="button"
              aria-label="Close ingredients"
              onClick={() => setIngredientsOpen(false)}
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(6,4,2,0.6)",
                zIndex: 400,
                border: "none",
                cursor: "default",
                padding: 0,
              }}
            />
            {/* Sheet panel */}
            <div
              style={{
                position: "fixed",
                bottom: 0,
                left: 0,
                right: 0,
                maxHeight: "60%",
                background: "rgba(6,4,2,0.97)",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
                borderRadius: "20px 20px 0 0",
                zIndex: 401,
                overflowY: "auto",
                padding: "20px 14px 30px",
              }}
            >
              {/* Close button */}
              <button
                type="button"
                onClick={() => setIngredientsOpen(false)}
                style={{
                  position: "absolute",
                  top: 12,
                  right: 12,
                  background: "rgba(0,0,0,0.38)",
                  backdropFilter: "blur(16px)",
                  WebkitBackdropFilter: "blur(16px)",
                  borderRadius: 99,
                  padding: "6px 10px",
                  cursor: "pointer",
                  border: "1px solid rgba(255,255,255,0.15)",
                  color: "rgba(255,255,255,0.90)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <XIcon style={{ width: 12, height: 12 }} />
              </button>
              {/* Content */}
              <ServingsCalculator
                originalServings={recipe.servings}
                ingredients={recipe.ingredients}
              />
            </div>
          </>,
          document.body,
        )}
    </div>,
    document.body,
  );
}
