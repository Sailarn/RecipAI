import { describe, expect, it } from "vitest";
import { pickMatchFromNeighbors } from "../vocab-vector-search";

describe("pickMatchFromNeighbors", () => {
  it("returns the top id when strong and clearly ahead", () => {
    const result = pickMatchFromNeighbors([
      { id: "garlic", sim: 0.91 },
      { id: "onion", sim: 0.7 },
    ]);

    expect(result).toBe("garlic");
  });

  it("returns null when the top match is below threshold", () => {
    const result = pickMatchFromNeighbors([{ id: "garlic", sim: 0.8 }]);

    expect(result).toBeNull();
  });

  it("returns null when the runner-up is within the gap", () => {
    const result = pickMatchFromNeighbors([
      { id: "garlic", sim: 0.9 },
      { id: "garlic-powder", sim: 0.86 },
    ]);

    expect(result).toBeNull();
  });

  it("returns null when there are no neighbors", () => {
    expect(pickMatchFromNeighbors([])).toBeNull();
  });
});
