import type { RecipeSection } from "@/lib/db/schema";

export interface InstructionSectionState {
  sections: RecipeSection[];
  stepIds: string[];
  sectionIdByStepId: Record<string, string | undefined>;
}
