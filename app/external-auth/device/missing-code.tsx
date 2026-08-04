"use client";

import { useTranslations } from "next-intl";

export function MissingCode() {
  const t = useTranslations("auth");

  return <main className="p-6">{t("missingCode")}</main>;
}
