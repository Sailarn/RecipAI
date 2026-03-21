/**
 * @vitest-environment happy-dom
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DeleteModal } from "../delete-modal";

// Mock next-intl
vi.mock("next-intl", () => ({
    useTranslations: () => (key: string) => key,
}));

describe("DeleteModal", () => {
    it("does not render when isOpen is false", () => {
        render(
            <DeleteModal
                isOpen={false}
                onConfirm={vi.fn()}
                onCancel={vi.fn()}
            />
        );

        expect(screen.queryByRole("heading", { name: /confirm/i })).not.toBeInTheDocument();
    });

    it("renders when isOpen is true", () => {
        render(
            <DeleteModal
                isOpen={true}
                onConfirm={vi.fn()}
                onCancel={vi.fn()}
            />
        );

        expect(screen.getByRole("heading", { name: /confirm/i })).toBeInTheDocument();
        expect(screen.getByText(/deleteConfirm/i)).toBeInTheDocument();
    });

    it("calls onConfirm when delete button clicked", async () => {
        const user = userEvent.setup();
        const onConfirm = vi.fn();

        render(
            <DeleteModal
                isOpen={true}
                onConfirm={onConfirm}
                onCancel={vi.fn()}
            />
        );

        const deleteButton = screen.getAllByRole("button", { name: /delete/i })[0];
        await user.click(deleteButton);

        expect(onConfirm).toHaveBeenCalledTimes(1);
    });

    it("calls onCancel when cancel button clicked", async () => {
        const user = userEvent.setup();
        const onCancel = vi.fn();

        render(
            <DeleteModal
                isOpen={true}
                onConfirm={vi.fn()}
                onCancel={onCancel}
            />
        );

        const cancelButton = screen.getByRole("button", { name: /cancel/i });
        await user.click(cancelButton);

        expect(onCancel).toHaveBeenCalledTimes(1);
    });
});