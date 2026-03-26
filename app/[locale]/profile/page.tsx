import { useTranslations } from "next-intl";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui";

export default function ProfilePage() {
  const t = useTranslations("profile");

  return (
    <div className="p-4 max-w-md mx-auto pt-10">
      <h1
        className="text-2xl font-bold mb-8"
        style={{ color: "var(--foreground)" }}
      >
        {t("title")}
      </h1>

      {/* Login placeholder */}
      <div
        className="w-full rounded-xl p-6 mb-6 flex flex-col items-center gap-3 text-center"
        style={{
          background: "var(--muted)",
          border: "1px solid var(--input-border)",
        }}
      >
        <div className="text-4xl">👤</div>
        <p
          className="text-sm w-full break-words"
          style={{ color: "var(--muted-foreground)" }}
        >
          {t("loginPrompt")}
        </p>
        <Button disabled className="w-full opacity-60 cursor-not-allowed">
          {t("login")}
        </Button>
      </div>

      {/* Settings */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ border: "1px solid var(--input-border)" }}
      >
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: "1px solid var(--input-border)" }}
        >
          <span className="text-sm font-medium">{t("theme")}</span>
          <ThemeToggle />
        </div>
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-sm font-medium">{t("language")}</span>
          <LanguageSwitcher />
        </div>
      </div>
    </div>
  );
}
