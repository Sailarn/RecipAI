import type { InstructionSectionState } from "./types";

export function orderStepIds(
  state: InstructionSectionState,
  sectionIdByStepId: InstructionSectionState["sectionIdByStepId"],
  stepIds: string[],
) {
  const sectionIds = new Set(state.sections.map((section) => section.id));
  return [
    ...state.sections.flatMap((section) =>
      stepIds.filter((stepId) => sectionIdByStepId[stepId] === section.id),
    ),
    ...stepIds.filter((stepId) => {
      const sectionId = sectionIdByStepId[stepId];
      return !sectionId || !sectionIds.has(sectionId);
    }),
  ];
}

export function moveStepToDropTarget(
  state: InstructionSectionState,
  stepId: string,
  sectionId?: string,
): InstructionSectionState {
  const sectionIdByStepId = { ...state.sectionIdByStepId, [stepId]: sectionId };
  const stepIds = [...state.stepIds.filter((id) => id !== stepId), stepId];
  return {
    ...state,
    stepIds: orderStepIds(state, sectionIdByStepId, stepIds),
    sectionIdByStepId,
  };
}

export function moveStepToStep(
  state: InstructionSectionState,
  stepId: string,
  targetStepId: string,
): InstructionSectionState {
  const sourceIndex = state.stepIds.indexOf(stepId);
  const destinationIndex = state.stepIds.indexOf(targetStepId);
  const remainingStepIds = state.stepIds.filter((id) => id !== stepId);
  const targetIndex = remainingStepIds.indexOf(targetStepId);
  const insertionIndex =
    sourceIndex < destinationIndex ? targetIndex + 1 : targetIndex;
  const stepIds = [
    ...remainingStepIds.slice(0, insertionIndex),
    stepId,
    ...remainingStepIds.slice(insertionIndex),
  ];
  const sectionIdByStepId = {
    ...state.sectionIdByStepId,
    [stepId]: state.sectionIdByStepId[targetStepId],
  };
  return {
    ...state,
    stepIds: orderStepIds(state, sectionIdByStepId, stepIds),
    sectionIdByStepId,
  };
}

export function removeStepSection(
  state: InstructionSectionState,
  sectionId: string,
  ingredientSectionIds: ReadonlySet<string>,
): InstructionSectionState {
  const sectionIdByStepId = Object.fromEntries(
    Object.entries(state.sectionIdByStepId).map(([stepId, value]) => [
      stepId,
      value === sectionId ? undefined : value,
    ]),
  );
  const sections = ingredientSectionIds.has(sectionId)
    ? state.sections
    : state.sections
        .filter((section) => section.id !== sectionId)
        .map((section, order) => ({ ...section, order }));

  return {
    sections,
    stepIds: orderStepIds(
      { ...state, sections },
      sectionIdByStepId,
      state.stepIds,
    ),
    sectionIdByStepId,
  };
}
