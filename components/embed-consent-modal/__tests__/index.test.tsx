import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { grantEmbedConsent, preWarmEmbedWorker, hasEmbedConsent } = vi.hoisted(
  () => ({
    grantEmbedConsent: vi.fn(),
    preWarmEmbedWorker: vi.fn(),
    hasEmbedConsent: vi.fn().mockReturnValue(false),
  }),
);

vi.mock("@/lib/parse-recipe/embed-consent", () => ({
  grantEmbedConsent,
  hasEmbedConsent,
}));
vi.mock("@/lib/parse-recipe/embed-client", () => ({
  preWarmEmbedWorker,
}));

// The component guards on a module-level `shownThisSession` flag, so each test
// needs a fresh module instance to see the modal open again.
async function renderModal() {
  vi.resetModules();
  const { EmbedConsentModal } = await import("../index");
  return render(<EmbedConsentModal />);
}

beforeEach(() => {
  vi.clearAllMocks();
  hasEmbedConsent.mockReturnValue(false);
});

describe("EmbedConsentModal", () => {
  it("shows the consent prompt on first session without consent", async () => {
    await renderModal();

    expect(screen.getByText("AI Ingredient Matching")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Allow Download" }),
    ).toBeInTheDocument();
  });

  it("grants consent and pre-warms the worker on Allow", async () => {
    await renderModal();

    fireEvent.click(screen.getByRole("button", { name: "Allow Download" }));

    expect(grantEmbedConsent).toHaveBeenCalled();
    expect(preWarmEmbedWorker).toHaveBeenCalled();
  });

  it("closes (unmounts after slide-down) when Allow is clicked", async () => {
    const { container } = await renderModal();

    fireEvent.click(screen.getByRole("button", { name: "Allow Download" }));
    act(() => {
      fireEvent.animationEnd(screen.getByText("AI Ingredient Matching"));
    });

    expect(container.firstChild).toBeNull();
  });

  it("closes without granting consent on Not now", async () => {
    const { container } = await renderModal();

    fireEvent.click(screen.getByRole("button", { name: "Not now" }));
    act(() => {
      fireEvent.animationEnd(screen.getByText("AI Ingredient Matching"));
    });

    expect(grantEmbedConsent).not.toHaveBeenCalled();
    expect(container.firstChild).toBeNull();
  });
});
