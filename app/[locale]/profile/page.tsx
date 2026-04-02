import { useTranslations } from "next-intl";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ProfileAuth } from "@/components/profile-auth";
import { ThemeToggle } from "@/components/theme-toggle";
import { Card, CardContent, Separator } from "@/components/ui";

export default function ProfilePage() {
  const t = useTranslations("profile");

  return (
    <div className="p-4 max-w-md mx-auto pt-10">
      <h1 className="text-2xl font-bold mb-8">{t("title")}</h1>

      {/* Login placeholder */}
      <Card className="mb-6 shadow-md border-0">
        <CardContent className="pb-6">
          <ProfileAuth />
        </CardContent>
      </Card>

      {/* Settings */}
      <Card className="shadow-md border-0 py-0">
        <CardContent className="p-0 [&]:pt-0">
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-sm font-medium">{t("theme")}</span>
            <ThemeToggle />
          </div>
          <Separator />
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-sm font-medium">{t("language")}</span>
            <LanguageSwitcher />
          </div>
        </CardContent>
      </Card>
      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-sm font-medium">Version</span>
        <span className="text-sm text-muted-foreground">
          v{process.env.NEXT_PUBLIC_APP_VERSION}
        </span>
      </div>
    </div>
  );
}
