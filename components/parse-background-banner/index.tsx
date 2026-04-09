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
    <div className="mt-4 p-4 rounded-xl bg-muted text-sm text-muted-foreground text-center space-y-3">
      <p>⏳ Parsing in background...</p>
      <p className="text-xs">You'll get a notification when it's ready.</p>
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
