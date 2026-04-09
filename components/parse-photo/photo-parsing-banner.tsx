"use client";

import { Button } from "@/components/ui/button";
import { routes } from "@/lib/routes";
import { useNavigate } from "@/lib/transitions";

interface PhotoParsingBannerProps {
  locale: string;
  onParseAnother: () => void;
}

export function PhotoParsingBanner({
  locale,
  onParseAnother,
}: PhotoParsingBannerProps) {
  const navigate = useNavigate();

  return (
    <div className="mt-4 p-4 rounded-xl bg-muted text-sm text-muted-foreground text-center space-y-3">
      <p>⏳ Parsing photo...</p>
      <p className="text-xs">
        You can navigate away — you'll be notified when done.
      </p>
      <div className="flex gap-2 justify-center">
        <Button variant="outline" size="sm" onClick={onParseAnother}>
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
