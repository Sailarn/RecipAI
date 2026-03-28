import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";
import "fake-indexeddb/auto";
import { createElement } from "react";

vi.mock("@/lib/transitions", () => ({
  slideTransition: vi.fn(),
  useNavigate: () => ({
    push: vi.fn(),
    back: vi.fn(),
    replace: vi.fn(),
  }),
}));

vi.mock("next-view-transitions", () => ({
  Link: ({ href, children, ...props }: { href: string; children: React.ReactNode; [key: string]: unknown }) =>
    createElement("a", { href, ...props }, children),
  useTransitionRouter: () => ({
    push: vi.fn(),
    back: vi.fn(),
    replace: vi.fn(),
  }),
  ViewTransitions: ({ children }: { children: React.ReactNode }) => children,
}));

afterEach(() => {
  cleanup();
});