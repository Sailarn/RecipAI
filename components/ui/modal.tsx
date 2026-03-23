import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  closeOnBackdropClick?: boolean;
}

export function Modal({
  isOpen,
  onClose,
  children,
  closeOnBackdropClick = true,
}: ModalProps) {
  const t = useTranslations("common");

  if (!isOpen) return null;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 w-full h-full border-none cursor-default"
        style={{ backgroundColor: "var(--modal-backdrop)" }}
        onClick={closeOnBackdropClick ? onClose : undefined}
        onKeyDown={handleKeyDown}
        aria-label={t("closeModal")}
      />
      <div
        className="relative rounded-lg p-6 max-w-md w-full shadow-xl"
        style={{
          backgroundColor: "var(--card)",
          color: "var(--foreground)",
        }}
        role="dialog"
        aria-modal="true"
        onKeyDown={handleKeyDown}
      >
        {children}
      </div>
    </div>
  );
}
