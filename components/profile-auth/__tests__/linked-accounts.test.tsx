/**
 * @vitest-environment happy-dom
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useParams: () => ({ locale: "en" }),
}));

vi.mock("@/lib/auth/auth-client", () => ({
  authClient: {
    linkSocial: vi.fn().mockResolvedValue(undefined),
  },
}));

import { LinkedAccounts } from "../linked-accounts";

const defaultProps = {
  linkedProviders: [],
  telegramLinked: false,
  passkeyAdded: false,
  isLoading: false,
  onLinkGoogle: vi.fn(),
  onAddPasskey: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("LinkedAccounts", () => {
  describe("loading state", () => {
    it("shows section heading but no connect buttons", () => {
      render(<LinkedAccounts {...defaultProps} isLoading />);
      expect(screen.getByText("connectedAccounts")).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "connect" }),
      ).not.toBeInTheDocument();
    });
  });

  describe("provider rows", () => {
    it("shows all three provider names", () => {
      render(<LinkedAccounts {...defaultProps} />);
      expect(screen.getByText("Google")).toBeInTheDocument();
      expect(screen.getByText("Passkey")).toBeInTheDocument();
      expect(screen.getByText("Telegram")).toBeInTheDocument();
    });

    it("shows Connect buttons for all unlinked providers", () => {
      render(<LinkedAccounts {...defaultProps} />);
      expect(screen.getAllByRole("button", { name: "connect" })).toHaveLength(
        3,
      );
    });

    it("shows Connected badge for linked google", () => {
      render(<LinkedAccounts {...defaultProps} linkedProviders={["google"]} />);
      expect(screen.getByText("connected")).toBeInTheDocument();
    });

    it("shows Connected badge for passkey when passkeyAdded is true", () => {
      render(<LinkedAccounts {...defaultProps} passkeyAdded />);
      expect(screen.getByText("connected")).toBeInTheDocument();
    });

    it("shows Connected badge for telegram when telegramLinked is true", () => {
      render(<LinkedAccounts {...defaultProps} telegramLinked />);
      expect(screen.getByText("connected")).toBeInTheDocument();
    });

    it("shows three Connected badges when all providers are linked", () => {
      render(
        <LinkedAccounts
          {...defaultProps}
          linkedProviders={["google"]}
          telegramLinked
          passkeyAdded
        />,
      );
      expect(screen.getAllByText("connected")).toHaveLength(3);
    });
  });

  describe("connect handlers", () => {
    it("calls onLinkGoogle when Google Connect is clicked", () => {
      const onLinkGoogle = vi.fn();
      render(<LinkedAccounts {...defaultProps} onLinkGoogle={onLinkGoogle} />);
      fireEvent.click(screen.getAllByRole("button", { name: "connect" })[0]);
      expect(onLinkGoogle).toHaveBeenCalledOnce();
    });

    it("calls onAddPasskey when Passkey Connect is clicked", () => {
      const onAddPasskey = vi.fn();
      render(<LinkedAccounts {...defaultProps} onAddPasskey={onAddPasskey} />);
      fireEvent.click(screen.getAllByRole("button", { name: "connect" })[1]);
      expect(onAddPasskey).toHaveBeenCalledOnce();
    });
  });
});
