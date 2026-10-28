/**
 * @vitest-environment happy-dom
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ParsedRecipe } from "@/lib/db/schema";

const { addParseNotification, toastSuccess, captureError } = vi.hoisted(() => ({
  addParseNotification: vi.fn(),
  toastSuccess: vi.fn(),
  captureError: vi.fn(),
}));
vi.mock("@/lib/db/parse-notifications", () => ({ addParseNotification }));
vi.mock("sonner", () => ({ toast: { success: toastSuccess } }));
vi.mock("@/lib/telemetry", () => ({ captureError }));

import { PARSE_JOB_SETTLED_EVENT } from "@/lib/parse-job-events";
import { announceFailedParse, announceSavedParse } from "../announce-parse";

const recipe = { title: "Soup" } as ParsedRecipe;
const labels = { added: "Added to your recipes.", alreadySaved: "Already." };

beforeEach(() => {
  vi.clearAllMocks();
  addParseNotification.mockResolvedValue(undefined);
});

describe("announceSavedParse", () => {
  it("adds a bell entry that opens the saved recipe", () => {
    announceSavedParse({
      jobId: "job-1",
      recipe,
      recipeId: "recipe-1",
      alreadySaved: false,
      labels,
    });

    expect(addParseNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "job-1",
        status: "done",
        title: "Soup",
        recipeId: "recipe-1",
      }),
    );
  });

  it("toasts the title without any action buttons", () => {
    announceSavedParse({
      jobId: "job-1",
      recipe,
      recipeId: "recipe-1",
      alreadySaved: false,
      labels,
    });

    expect(toastSuccess).toHaveBeenCalledWith("Soup", {
      description: "Added to your recipes.",
    });
  });

  it("says when the link was already in the library", () => {
    announceSavedParse({
      jobId: "job-1",
      recipe,
      recipeId: "recipe-1",
      alreadySaved: true,
      labels,
    });

    expect(toastSuccess).toHaveBeenCalledWith("Soup", {
      description: "Already.",
    });
  });

  it("tells the parse page the job settled", () => {
    const listener = vi.fn();
    window.addEventListener(PARSE_JOB_SETTLED_EVENT, listener);

    announceSavedParse({
      jobId: "job-1",
      recipe,
      recipeId: "recipe-1",
      alreadySaved: false,
      labels,
    });

    window.removeEventListener(PARSE_JOB_SETTLED_EVENT, listener);
    expect(listener.mock.calls[0][0].detail).toEqual({
      jobId: "job-1",
      status: "done",
      recipeId: "recipe-1",
      recipe,
      alreadySaved: false,
    });
  });

  it("reports a failed bell write", async () => {
    const writeError = new Error("dexie");
    addParseNotification.mockRejectedValue(writeError);

    announceSavedParse({
      jobId: "job-1",
      recipe,
      recipeId: "recipe-1",
      alreadySaved: false,
      labels,
    });
    await Promise.resolve();

    expect(captureError).toHaveBeenCalledWith(writeError, expect.anything());
  });
});

describe("announceFailedParse", () => {
  it("adds a failed bell entry and settles the job", () => {
    const listener = vi.fn();
    window.addEventListener(PARSE_JOB_SETTLED_EVENT, listener);

    announceFailedParse({
      jobId: "job-1",
      title: "example.com",
      reason: "No recipe found",
    });

    window.removeEventListener(PARSE_JOB_SETTLED_EVENT, listener);
    expect(addParseNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "job-1",
        status: "failed",
        title: "example.com",
        reason: "No recipe found",
      }),
    );
    expect(listener.mock.calls[0][0].detail).toEqual({
      jobId: "job-1",
      status: "failed",
      reason: "No recipe found",
    });
  });
});
