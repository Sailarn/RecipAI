/**
 * @vitest-environment happy-dom
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

import { PARSE_HISTORY_STATUS } from "@/lib/db/schema";
import { ParseHistoryView } from "../index";

const { addJobId, fetchMock, toastError } = vi.hoisted(() => ({
  addJobId: vi.fn(),
  fetchMock: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("dexie-react-hooks", () => ({
  useLiveQuery: vi.fn().mockReturnValue([
    {
      id: "failed-job",
      title: "example.com",
      status: PARSE_HISTORY_STATUS.FAILED,
      url: "https://example.com/recipe",
      reason: "Temporary failure",
      createdAt: new Date("2026-01-01"),
    },
    {
      id: "private-job",
      title: "instagram.com",
      status: PARSE_HISTORY_STATUS.FAILED,
      url: "https://instagram.com/reel/private",
      reason:
        "This account is private or the content is restricted — only public posts can be parsed.",
      createdAt: new Date("2026-01-02"),
    },
  ]),
}));

vi.mock("@/lib/parse-job-storage", () => ({ addJobId }));
vi.mock("@/lib/telemetry", () => ({ trackEvent: vi.fn() }));
vi.mock("@/lib/transitions", () => ({
  useNavigate: () => ({ push: vi.fn(), back: vi.fn(), replace: vi.fn() }),
}));
vi.mock("sonner", () => ({ toast: { error: toastError } }));

beforeEach(() => {
  vi.clearAllMocks();
  fetchMock.mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ jobId: "retry-job", uploadToken: "token" }),
  });
  vi.stubGlobal("fetch", fetchMock);
});

describe("ParseHistoryView", () => {
  it("re-enqueues a failed URL import", async () => {
    render(<ParseHistoryView />);

    await userEvent.click(screen.getByRole("button", { name: "Retry" }));

    await waitFor(() =>
      expect(addJobId).toHaveBeenCalledWith("retry-job", "token"),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/api/parse-queue",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ url: "https://example.com/recipe" }),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/parse-queue/process",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ jobId: "retry-job" }),
      }),
    );
  });

  it("hides Retry for a permanent (private/restricted) failure", () => {
    render(<ParseHistoryView />);

    expect(screen.getAllByRole("button", { name: "Retry" })).toHaveLength(1);
  });

  it("does not replace maintenance with a generic retry error", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          error: "Back after lunch",
          code: "MAINTENANCE_MODE",
        }),
        { status: 503 },
      ),
    );
    render(<ParseHistoryView />);

    await userEvent.click(screen.getByRole("button", { name: "Retry" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    expect(toastError).not.toHaveBeenCalledWith("retryFailed");
    expect(addJobId).not.toHaveBeenCalled();
  });
});
