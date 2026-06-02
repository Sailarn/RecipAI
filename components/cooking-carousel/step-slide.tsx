import { RecipeImage } from "@/components/recipe-image";
import type { Step } from "@/lib/db/schema";

interface StepSlideProps {
  step: Step;
  totalSteps: number;
}

export function StepSlide({ step, totalSteps }: StepSlideProps) {
  return (
    <div className="px-[14px] pb-5 h-full overflow-y-auto">
      <div className="relative w-full h-[190px] rounded-2xl overflow-hidden mb-3">
        <RecipeImage
          imageUrl={step.imageUrl}
          title={`Step ${step.order}`}
          width={800}
        />
        <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(6,4,2,0.97)_0%,transparent_60%)]" />
        <div className="absolute bottom-2 left-2 py-1 px-2 rounded-full bg-[rgba(0,0,0,0.38)] backdrop-blur-[16px] text-[10px] font-medium text-white">
          Step {step.order}/{totalSteps}
        </div>
      </div>
      <p className="text-[13px] text-[var(--fg-1)] leading-[1.6] px-1">
        {step.instruction}
      </p>
    </div>
  );
}
