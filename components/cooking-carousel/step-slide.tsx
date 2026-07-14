import { RecipeImage } from "@/components/recipe-image";
import { sectionName } from "@/lib/db/recipe-sections";
import type { RecipeSection, Step } from "@/lib/db/schema";

interface StepSlideProps {
  step: Step;
  totalSteps: number;
  sections?: RecipeSection[];
}

const SHORT_INSTRUCTION_MAX_LENGTH = 60;
const MEDIUM_INSTRUCTION_MAX_LENGTH = 140;
const LONG_INSTRUCTION_MAX_LENGTH = 260;

function getInstructionTypographyClass(instruction: string): string {
  const instructionLength = instruction.trim().length;

  if (instructionLength <= SHORT_INSTRUCTION_MAX_LENGTH) {
    return "text-[24px] leading-[1.45]";
  }
  if (instructionLength <= MEDIUM_INSTRUCTION_MAX_LENGTH) {
    return "text-[20px] leading-[1.5]";
  }
  if (instructionLength <= LONG_INSTRUCTION_MAX_LENGTH) {
    return "text-[17px] leading-[1.55]";
  }
  return "text-[14px] leading-[1.6]";
}

export function StepSlide({ step, totalSteps, sections }: StepSlideProps) {
  const instructionTypographyClass = getInstructionTypographyClass(
    step.instruction,
  );
  const stepSectionName = sectionName(step.sectionId ?? null, sections);

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
      {stepSectionName && (
        <div className="px-1 mb-1 text-[12px] font-semibold uppercase tracking-wide text-[var(--fg-2)]">
          {stepSectionName}
        </div>
      )}
      <p className={`${instructionTypographyClass} px-1 text-[var(--fg-1)]`}>
        {step.instruction}
      </p>
    </div>
  );
}
