import { describe, expect, it } from "vitest";
import { pickMatchFromNeighbors } from "../vocab-vector-search";

// Thresholds (0.88 / 0.02) are calibrated from the e5-small distribution — see
// the comment in vocab-vector-search.ts and scripts/local/admin/calibrate.
describe("pickMatchFromNeighbors", () => {
  it("returns the top id when strong and clearly ahead", () => {
    const result = pickMatchFromNeighbors([
      { id: "garlic", sim: 0.93 },
      { id: "onion", sim: 0.84 },
    ]);

    expect(result).toBe("garlic");
  });

  it("matches a strong top even when a sibling sits just below (the gap fix)", () => {
    const result = pickMatchFromNeighbors([
      { id: "bell-pepper-red", sim: 0.935 },
      { id: "bell-pepper-green", sim: 0.889 },
    ]);

    expect(result).toBe("bell-pepper-red");
  });

  it("matches at the 0.88 threshold boundary", () => {
    const result = pickMatchFromNeighbors([
      { id: "zucchini", sim: 0.88 },
      { id: "teriyaki-sauce", sim: 0.82 },
    ]);

    expect(result).toBe("zucchini");
  });

  it("rejects a generic that lands just below threshold (fresh herbs → 0.875)", () => {
    const result = pickMatchFromNeighbors([
      { id: "turmeric-fresh", sim: 0.875 },
      { id: "yeast-fresh", sim: 0.863 },
    ]);

    expect(result).toBeNull();
  });

  it("rejects a cross-lingual miss below threshold (кабачок → cabbage-red 0.826)", () => {
    const result = pickMatchFromNeighbors([
      { id: "cabbage-red", sim: 0.826 },
      { id: "crab-stick", sim: 0.819 },
    ]);

    expect(result).toBeNull();
  });

  it("rejects a genuine dead-heat within the 0.02 gap", () => {
    const result = pickMatchFromNeighbors([
      { id: "black-pepper", sim: 0.9 },
      { id: "bell-pepper", sim: 0.885 },
    ]);

    expect(result).toBeNull();
  });

  it("returns null when there are no neighbors", () => {
    expect(pickMatchFromNeighbors([])).toBeNull();
  });
});
