import { describe, expect, it, vi } from "vitest";
import {
  dispatchParsedRecipeCreated,
  PARSED_RECIPE_CREATED_EVENT,
  parseParsedRecipeCreatedEvent,
} from "../parse-job-events";

describe("parsed-recipe-created event", () => {
  it("round-trips the job and entry ids through window", () => {
    const listener = vi.fn();
    window.addEventListener(PARSED_RECIPE_CREATED_EVENT, listener);

    dispatchParsedRecipeCreated({ jobId: "job-1", entryId: "entry-1" });

    window.removeEventListener(PARSED_RECIPE_CREATED_EVENT, listener);
    expect(parseParsedRecipeCreatedEvent(listener.mock.calls[0][0])).toEqual({
      jobId: "job-1",
      entryId: "entry-1",
    });
  });

  it.each([
    ["no detail", new Event(PARSED_RECIPE_CREATED_EVENT)],
    [
      "a missing entry id",
      new CustomEvent(PARSED_RECIPE_CREATED_EVENT, {
        detail: { jobId: "job-1" },
      }),
    ],
    [
      "a non-string job id",
      new CustomEvent(PARSED_RECIPE_CREATED_EVENT, {
        detail: { jobId: 1, entryId: "entry-1" },
      }),
    ],
  ])("rejects an event with %s", (_label, event) => {
    expect(parseParsedRecipeCreatedEvent(event)).toBeNull();
  });
});
