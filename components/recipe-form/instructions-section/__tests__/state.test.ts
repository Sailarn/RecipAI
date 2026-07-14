import { describe, expect, it } from "vitest";
import {
  moveStepToDropTarget,
  moveStepToStep,
  orderStepIds,
  removeStepSection,
} from "../state";
import type { InstructionSectionState } from "../types";

const state: InstructionSectionState = {
  sections: [{ id: "sauce", name: "Sauce", order: 0 }],
  stepIds: ["sauce-step", "ungrouped-one", "ungrouped-two"],
  sectionIdByStepId: {
    "sauce-step": "sauce",
    "ungrouped-one": undefined,
    "ungrouped-two": undefined,
  },
};

describe("instruction section drag state", () => {
  it("moves an ungrouped step into a section drop target", () => {
    expect(moveStepToDropTarget(state, "ungrouped-one", "sauce")).toEqual({
      ...state,
      stepIds: ["sauce-step", "ungrouped-one", "ungrouped-two"],
      sectionIdByStepId: {
        "sauce-step": "sauce",
        "ungrouped-one": "sauce",
        "ungrouped-two": undefined,
      },
    });
  });

  it("moves a section step into the ungrouped drop target", () => {
    expect(moveStepToDropTarget(state, "sauce-step")).toEqual({
      ...state,
      stepIds: ["ungrouped-one", "ungrouped-two", "sauce-step"],
      sectionIdByStepId: {
        "sauce-step": undefined,
        "ungrouped-one": undefined,
        "ungrouped-two": undefined,
      },
    });
  });

  it("reorders a step before another step in its destination section", () => {
    expect(moveStepToStep(state, "ungrouped-two", "sauce-step")).toEqual({
      ...state,
      stepIds: ["ungrouped-two", "sauce-step", "ungrouped-one"],
      sectionIdByStepId: {
        "sauce-step": "sauce",
        "ungrouped-one": undefined,
        "ungrouped-two": "sauce",
      },
    });
  });

  it("reorders two existing ungrouped steps without changing membership", () => {
    expect(moveStepToStep(state, "ungrouped-two", "ungrouped-one")).toEqual({
      ...state,
      stepIds: ["sauce-step", "ungrouped-two", "ungrouped-one"],
      sectionIdByStepId: state.sectionIdByStepId,
    });
  });

  it("moves a step downward after the step it is dropped over", () => {
    expect(moveStepToStep(state, "ungrouped-one", "ungrouped-two")).toEqual({
      ...state,
      stepIds: ["sauce-step", "ungrouped-two", "ungrouped-one"],
      sectionIdByStepId: state.sectionIdByStepId,
    });
  });

  it("keeps steps with unknown section references visible as ungrouped", () => {
    expect(
      orderStepIds(
        state,
        { ...state.sectionIdByStepId, "ungrouped-one": "missing" },
        state.stepIds,
      ),
    ).toEqual(["sauce-step", "ungrouped-one", "ungrouped-two"]);
  });

  it("keeps a deleted section catalog entry when ingredients still use it", () => {
    expect(removeStepSection(state, "sauce", new Set(["sauce"]))).toEqual({
      sections: state.sections,
      stepIds: ["sauce-step", "ungrouped-one", "ungrouped-two"],
      sectionIdByStepId: {
        "sauce-step": undefined,
        "ungrouped-one": undefined,
        "ungrouped-two": undefined,
      },
    });
  });

  it("removes a deleted section catalog entry when nothing else uses it", () => {
    expect(removeStepSection(state, "sauce", new Set())).toEqual({
      sections: [],
      stepIds: ["sauce-step", "ungrouped-one", "ungrouped-two"],
      sectionIdByStepId: {
        "sauce-step": undefined,
        "ungrouped-one": undefined,
        "ungrouped-two": undefined,
      },
    });
  });
});
