"use client";

import { Button } from "@/components/ui/button";
import { routes } from "@/lib/routes";
import { useNavigate } from "@/lib/transitions";

interface ParseBackgroundBannerProps {
  locale: string;
  onReset: () => void;
}

export function ParseBackgroundBanner({
  locale,
  onReset,
}: ParseBackgroundBannerProps) {
  const navigate = useNavigate();

  return (
    <div
      className="mt-4 p-4 rounded-2xl text-center space-y-3"
      style={{
        background: "var(--glass-subtle-bg)",
        backdropFilter: "var(--glass-subtle-blur)",
        WebkitBackdropFilter: "var(--glass-subtle-blur)",
        border: "1px solid var(--glass-subtle-border)",
      }}
    >
      <p style={{ font: "var(--type-body-sm)", color: "var(--fg-1)" }}>
        ⏳ Parsing in background...
      </p>
      <p style={{ font: "var(--type-caption)", color: "var(--fg-2)" }}>
        You'll get a notification when it's ready.
      </p>
      <div className="flex gap-2 justify-center">
        <Button variant="outline" size="sm" onClick={onReset}>
          Parse another
        </Button>
        <Button
          size="sm"
          onClick={() => navigate.push(routes.recipes.list(locale))}
        >
          Go to recipes
        </Button>
      </div>
    </div>
  );
}
