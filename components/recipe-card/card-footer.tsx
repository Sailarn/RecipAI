import { ShoppingBasket } from "lucide-react";
import { useTranslations } from "next-intl";

interface CardFooterProps {
  title: string;
  servings: number | null | undefined;
  pantryMatch?: { missing: number; total: number } | null;
}

export function CardFooter({ title, servings, pantryMatch }: CardFooterProps) {
  const t = useTranslations("recipes");

  return (
    <div className="flex flex-col flex-1 p-2 gap-1">
      <h2 className="line-clamp-2 leading-snug font-[family-name:var(--font-display)] text-[12px] font-semibold text-[var(--fg-1)]">
        {title}
      </h2>
      <div className="flex items-center mt-auto">
        {servings && (
          <p className="text-[11px] text-[var(--fg-2)]">
            🍽️ {servings} {t("servings")}
          </p>
        )}
        {pantryMatch?.missing === 0 && (
          <p
            data-testid="badge-cancook"
            className="text-[10px] ml-auto text-green-500 font-sans font-semibold flex items-center"
          >
            <ShoppingBasket
              width={11}
              height={11}
              strokeWidth={2.2}
              aria-hidden="true"
            />
          </p>
        )}
        {pantryMatch && pantryMatch.missing > 0 && (
          <p
            data-testid="badge-nearly"
            className="text-[10px] ml-auto text-[var(--food-accent)] font-sans font-semibold flex items-center gap-[3px]"
          >
            <ShoppingBasket
              width={11}
              height={11}
              strokeWidth={2.2}
              aria-hidden="true"
            />
            {pantryMatch.total - pantryMatch.missing}/{pantryMatch.total}
          </p>
        )}
      </div>
    </div>
  );
}
