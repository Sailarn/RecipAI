import { BookOpenIcon, ChevronLeft, ChevronRight } from "lucide-react";

interface CookingNavBarProps {
  currentSlide: number;
  dotKeys: string[];
  isLastStep: boolean;
  onDotClick: (index: number) => void;
  onPrev: () => void;
  onNext: () => void;
  onOpenIngredients: () => void;
}

export function CookingNavBar({
  currentSlide,
  dotKeys,
  isLastStep,
  onDotClick,
  onPrev,
  onNext,
  onOpenIngredients,
}: CookingNavBarProps) {
  return (
    <div className="bg-[rgba(6,4,2,0.85)] backdrop-blur-[20px] py-2 px-[14px] flex justify-between items-center shrink-0">
      {currentSlide > 0 ? (
        <button
          type="button"
          onClick={onOpenIngredients}
          className="flex items-center gap-1.5 bg-white/[0.08] rounded-full py-[7px] px-3 cursor-pointer border-none"
        >
          <BookOpenIcon className="w-3.5 h-3.5 text-[var(--fg-2)]" />
          <span className="text-[11px] font-medium text-[var(--fg-2)]">
            Ingredients
          </span>
        </button>
      ) : (
        <div className="w-20" />
      )}

      <div className="flex items-center gap-1.5">
        {dotKeys.map((key, index) => (
          <button
            type="button"
            key={key}
            aria-label={`Go to slide ${index + 1}`}
            onClick={() => onDotClick(index)}
            className="w-1.5 h-1.5 rounded-[3px] border-none cursor-pointer p-0"
            style={{
              background:
                index === currentSlide
                  ? "var(--food-accent)"
                  : "rgba(255,255,255,0.15)",
            }}
          />
        ))}
      </div>

      <div className="flex gap-2 items-center">
        {currentSlide > 0 && (
          <button
            type="button"
            aria-label="Previous step"
            onClick={onPrev}
            className="w-9 h-9 rounded-full bg-white/[0.08] border border-white/[0.12] text-[var(--fg-2)] cursor-pointer flex items-center justify-center"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}

        <button
          type="button"
          onClick={onNext}
          className="h-9 rounded-full border-none cursor-pointer px-4 text-[13px] font-semibold flex items-center gap-1.5 text-white"
          style={{
            background: isLastStep
              ? "var(--food-accent)"
              : "var(--action-primary)",
          }}
        >
          {isLastStep ? "Done" : "Next"}
          {!isLastStep && <ChevronRight className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  );
}
