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
    <div className="flex flex-col flex-1 p-2 gap-1 group-data-[layout=tile]/card:absolute group-data-[layout=tile]/card:inset-x-0 group-data-[layout=tile]/card:bottom-0 group-data-[layout=tile]/card:p-3 group-data-[layout=tile]/card:pt-10 group-data-[layout=tile]/card:bg-linear-to-t group-data-[layout=tile]/card:from-black/85 group-data-[layout=tile]/card:via-black/55 group-data-[layout=tile]/card:to-transparent">
      <h2 className="line-clamp-2 leading-snug font-[family-name:var(--font-display)] text-[12px] font-semibold text-[var(--fg-1)] group-data-[layout=tile]/card:text-[15px] group-data-[layout=tile]/card:text-white">
        {title}
      </h2>
      <div className="flex items-center mt-auto">
        {servings && (
          <p className="text-[11px] text-[var(--fg-2)] group-data-[layout=tile]/card:text-white/80">
            🍽️ {t("servingsCount", { count: servings })}
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
