/**
 * @vitest-environment happy-dom
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PageErrorBoundary } from "../index";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

const { captureError } = vi.hoisted(() => ({ captureError: vi.fn() }));
vi.mock("@/lib/telemetry", () => ({ captureError }));

function Boom(): never {
  throw new Error("render exploded");
}

/** React logs caught render errors; silence that noise for these cases. */
function withSilencedErrorLog(run: () => void) {
  const consoleError = vi
    .spyOn(console, "error")
    .mockImplementation(() => undefined);
  try {
    run();
  } finally {
    consoleError.mockRestore();
  }
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("PageErrorBoundary", () => {
  it("renders its children when nothing throws", () => {
    render(
      <PageErrorBoundary>
        <p>page content</p>
      </PageErrorBoundary>,
    );

    expect(screen.getByText("page content")).toBeInTheDocument();
  });

  it("shows the fallback instead of unmounting the app when a page throws", () => {
    withSilencedErrorLog(() => {
      render(
        <PageErrorBoundary>
          <Boom />
        </PageErrorBoundary>,
      );
    });

    expect(screen.getByText("error")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "tryAgain" }),
    ).toBeInTheDocument();
  });

  it("reports the failure", () => {
    withSilencedErrorLog(() => {
      render(
        <PageErrorBoundary>
          <Boom />
        </PageErrorBoundary>,
      );
    });

    expect(captureError).toHaveBeenCalledWith(expect.any(Error), {
      tags: { source: "page-error-boundary" },
    });
  });

  it("re-renders the page when retry is used", () => {
    let shouldThrow = true;
    function MaybeBoom() {
      if (shouldThrow) throw new Error("render exploded");
      return <p>recovered</p>;
    }

    withSilencedErrorLog(() => {
      render(
        <PageErrorBoundary>
          <MaybeBoom />
        </PageErrorBoundary>,
      );
    });

    shouldThrow = false;
    fireEvent.click(screen.getByRole("button", { name: "tryAgain" }));

    expect(screen.getByText("recovered")).toBeInTheDocument();
  });
});
