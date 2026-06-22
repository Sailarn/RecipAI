import { describe, expect, it } from "vitest";
import { viewport } from "../layout";

describe("root viewport", () => {
  it("extends the application paint into device safe areas", () => {
    expect(viewport).toMatchObject({ viewportFit: "cover" });
  });
});
