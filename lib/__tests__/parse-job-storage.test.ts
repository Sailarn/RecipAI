/**
 * @vitest-environment happy-dom
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { addJobId, getJobIds, removeJobId } from "../parse-job-storage";

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
});

describe("getJobIds", () => {
  it("returns empty array when nothing is stored", () => {
    expect(getJobIds()).toEqual([]);
  });

  it("returns stored job IDs", () => {
    localStorage.setItem("parseJobIds", JSON.stringify(["id-1", "id-2"]));
    expect(getJobIds()).toEqual(["id-1", "id-2"]);
  });

  it("migrates old single parseJobId key to array format", () => {
    localStorage.setItem("parseJobId", "old-id");

    const result = getJobIds();

    expect(result).toEqual(["old-id"]);
    expect(localStorage.getItem("parseJobId")).toBeNull();
    expect(localStorage.getItem("parseJobIds")).toBe(
      JSON.stringify(["old-id"]),
    );
  });

  it("returns empty array on invalid JSON", () => {
    localStorage.setItem("parseJobIds", "not-json{{{");
    expect(getJobIds()).toEqual([]);
  });
});

describe("addJobId", () => {
  it("adds an ID to an empty list", () => {
    addJobId("job-1");
    expect(getJobIds()).toEqual(["job-1"]);
  });

  it("appends to an existing list", () => {
    localStorage.setItem("parseJobIds", JSON.stringify(["job-1"]));
    addJobId("job-2");
    expect(getJobIds()).toEqual(["job-1", "job-2"]);
  });

  it("does not add duplicate IDs", () => {
    addJobId("job-1");
    addJobId("job-1");
    expect(getJobIds()).toEqual(["job-1"]);
  });

  it("ignores a falsy jobId instead of storing it", () => {
    addJobId(undefined as unknown as string);
    addJobId("");

    expect(getJobIds()).toEqual([]);
  });
});

describe("getJobIds — corrupted entries", () => {
  it("filters out null, empty, and non-string entries", () => {
    localStorage.setItem(
      "parseJobIds",
      JSON.stringify([null, "", "job-1", 42, undefined, "job-2"]),
    );

    expect(getJobIds()).toEqual(["job-1", "job-2"]);
  });
});

describe("removeJobId", () => {
  it("removes an existing ID", () => {
    localStorage.setItem("parseJobIds", JSON.stringify(["job-1", "job-2"]));
    removeJobId("job-1");
    expect(getJobIds()).toEqual(["job-2"]);
  });

  it("does nothing when ID is not in list", () => {
    localStorage.setItem("parseJobIds", JSON.stringify(["job-1"]));
    removeJobId("job-99");
    expect(getJobIds()).toEqual(["job-1"]);
  });

  it("results in empty list when last ID is removed", () => {
    localStorage.setItem("parseJobIds", JSON.stringify(["job-1"]));
    removeJobId("job-1");
    expect(getJobIds()).toEqual([]);
  });
});
