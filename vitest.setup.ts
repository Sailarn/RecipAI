import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";
import "fake-indexeddb/auto";

vi.mock("@/lib/transitions", () => ({
  slideTransition: vi.fn(),
  useNavigate: () => ({
    push: vi.fn(),
    back: vi.fn(),
    replace: vi.fn(),
  }),
}));

afterEach(() => {
  cleanup();
});
