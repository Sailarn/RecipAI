"use client";

import { useTranslations } from "next-intl";
import { Button, Modal } from "@/components/ui";

interface DeleteModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteModal({ isOpen, onConfirm, onCancel }: DeleteModalProps) {
  const tRecipes = useTranslations("recipes");
  const tCommon = useTranslations("common");

  return (
    <Modal isOpen={isOpen} onClose={onCancel}>
      <h2 className="text-xl font-semibold mb-4">
        {tRecipes("deleteConfirm")}
      </h2>
      <div className="flex gap-4">
        <Button variant="destructive" onClick={onConfirm}>
          {tCommon("delete")}
        </Button>
        <Button variant="secondary" onClick={onCancel}>
          {tCommon("cancel")}
        </Button>
      </div>
    </Modal>
  );
}
