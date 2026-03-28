"use client";

import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { TransitionLink } from "@/components/transition-link";

export default function HomePage() {
  const params = useParams();
  const locale = params.locale as string;
  const tNav = useTranslations("navigation");
  const tCommon = useTranslations("common");
  const tHome = useTranslations("home");

  return (
    <div
      className="flex min-h-screen items-center justify-center font-sans"
      style={{ backgroundColor: "var(--muted)" }}
    >
      <main
        className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-between py-32 px-16 sm:items-start"
        style={{ backgroundColor: "var(--background)" }}
      >
        <div className="flex flex-col gap-8">
          <h1
            className="text-4xl font-bold"
            style={{ color: "var(--foreground)" }}
          >
            {tCommon("appName")}
          </h1>
          <p className="text-lg" style={{ color: "var(--muted-foreground)" }}>
            {tHome("tagline")}
          </p>
          <TransitionLink
            href={`/${locale}/recipes`}
            className="flex h-12 w-full items-center justify-center rounded-full border border-solid px-5 transition-colors hover:bg-[var(--hover)] md:w-[158px]"
            style={{
              borderColor: "var(--input-border)",
              color: "var(--foreground)",
            }}
          >
            {tNav("recipes")}
          </TransitionLink>
        </div>
      </main>
    </div>
  );
}
