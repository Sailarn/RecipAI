"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui";

interface FormActionsProps {
  isSubmitting: boolean;
  isEdit: boolean;
}

export function FormActions({ isSubmitting, isEdit }: FormActionsProps) {
  const t = useTranslations("common");
  const router = useRouter();

  return (
    <div className="flex gap-4">
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? t("saving") : isEdit ? t("save") : t("create")}
      </Button>
      <Button
        type="button"
        variant="secondary"
        onClick={() => router.back()}
        disabled={isSubmitting}
      >
        {t("cancel")}
      </Button>
    </div>
  );
}
