/**
 * @vitest-environment happy-dom
 */

import { describe, expect, it, vi } from "vitest";
import type { ParsedRecipe } from "@/lib/db/schema";
import {
  dispatchParseJobSettled,
  PARSE_JOB_SETTLED_EVENT,
  parseJobSettledDetail,
} from "../parse-job-events";

const recipe = { title: "Soup" } as ParsedRecipe;

describe("parse-job-settled event", () => {
  it("round-trips a saved outcome through window", () => {
    const listener = vi.fn();
    window.addEventListener(PARSE_JOB_SETTLED_EVENT, listener);

    dispatchParseJobSettled({
      jobId: "job-1",
      status: "done",
      recipeId: "recipe-1",
      recipe,
      alreadySaved: false,
    });

    window.removeEventListener(PARSE_JOB_SETTLED_EVENT, listener);
    expect(parseJobSettledDetail(listener.mock.calls[0][0])).toEqual({
      jobId: "job-1",
      status: "done",
      recipeId: "recipe-1",
      recipe,
      alreadySaved: false,
    });
  });

  it.each([
    ["no detail", new Event(PARSE_JOB_SETTLED_EVENT)],
    [
      "a non-string job id",
      new CustomEvent(PARSE_JOB_SETTLED_EVENT, {
        detail: { jobId: 1, status: "failed", reason: "x" },
      }),
    ],
  ])("rejects an event with %s", (_label, event) => {
    expect(parseJobSettledDetail(event)).toBeNull();
  });
});
