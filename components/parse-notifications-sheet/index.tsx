"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { BellIcon, CircleAlert, CircleCheck, X } from "lucide-react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { RecipeDetail } from "@/components/recipe-detail";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui";
import { db } from "@/lib/db/db";
import { dismissParseNotification } from "@/lib/db/parse-notifications";
import { PARSE_HISTORY_STATUS, type ParseNotification } from "@/lib/db/schema";
import { routes } from "@/lib/routes";
import { useNavigate } from "@/lib/transitions";

const BELL_BUTTON_CLASS =
  "relative p-2 rounded-full bg-[rgba(255,170,50,0.08)] border border-[rgba(255,200,100,0.18)] outline-none focus-visible:outline-none [-webkit-tap-highlight-color:transparent]";

/**
 * The bell: one entry per finished parse — saved or failed — until it is
 * opened or dismissed. Entries carry no actions; a saved recipe is already in
 * the library, so tapping one just opens it.
 */
export function ParseNotificationsSheet() {
  const t = useTranslations("recipes");
  const tParse = useTranslations("parse.notifications");
  const [open, setOpen] = useState(false);
  const notifications = useLiveQuery(
    () => db.parseNotifications.orderBy("createdAt").reverse().toArray(),
    [],
  );
  const count = notifications?.length ?? 0;

  const navigate = useNavigate();
  const params = useParams();
  const locale = params.locale as string;

  const openNotification = (notification: ParseNotification) => {
    setOpen(false);
    dismissParseNotification(notification.id).catch((caughtError) => {
      throw caughtError;
    });
    if (notification.recipeId) {
      navigate.push(
        routes.recipes.detail(locale, notification.recipeId),
        <RecipeDetail
          recipeId={notification.recipeId}
          locale={locale}
          via="import"
        />,
      );
    } else {
      navigate.push(routes.parseHistory(locale));
    }
  };

  if (count === 0) {
    return (
      <button
        type="button"
        disabled
        className={`${BELL_BUTTON_CLASS} opacity-30 cursor-default`}
      >
        <BellIcon size={18} className="text-[var(--fg-1)]" />
      </button>
    );
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          className={`${BELL_BUTTON_CLASS} cursor-pointer transition-colors duration-150`}
        >
          <BellIcon size={18} className="text-[var(--fg-1)]" />
          <span className="absolute -top-0.5 -right-0.5 bg-[var(--action-primary)] text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
            {count}
          </span>
        </button>
      </SheetTrigger>
      <SheetContent
        side="top"
        className="mx-auto max-w-2xl max-h-[80vh] overflow-y-auto rounded-b-2xl pt-[env(safe-area-inset-top)] [&_[data-slot=sheet-close]]:top-[calc(env(safe-area-inset-top)+1rem)]"
        aria-describedby={undefined}
      >
        <SheetHeader className="mb-4">
          <SheetTitle>{t("notifications")}</SheetTitle>
        </SheetHeader>
        <ul className="space-y-3 px-4 pb-6">
          {notifications?.map((notification) => {
            const isSaved = notification.status === PARSE_HISTORY_STATUS.DONE;
            return (
              <li
                key={notification.id}
                className="flex items-start gap-2 p-4 rounded-xl bg-muted"
              >
                <button
                  type="button"
                  onClick={() => openNotification(notification)}
                  className="flex flex-1 items-start gap-3 text-left cursor-pointer"
                >
                  {isSaved ? (
                    <CircleCheck
                      size={18}
                      className="shrink-0 text-[var(--action-primary)]"
                    />
                  ) : (
                    <CircleAlert
                      size={18}
                      className="shrink-0 text-[var(--action-destructive)]"
                    />
                  )}
                  <span>
                    <span className="block font-medium text-sm">
                      {notification.title}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {isSaved ? tParse("saved") : notification.reason}
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  aria-label={tParse("dismiss")}
                  onClick={() => {
                    dismissParseNotification(notification.id).catch(
                      (caughtError) => {
                        throw caughtError;
                      },
                    );
                  }}
                  className="shrink-0 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <X size={14} />
                </button>
              </li>
            );
          })}
        </ul>
      </SheetContent>
    </Sheet>
  );
}
