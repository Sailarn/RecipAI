"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { BellIcon } from "lucide-react";
import { useParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db/db";
import { saveParsedRecipe } from "@/lib/db/save-parsed-recipe";
import { getPendingUploadToken } from "@/lib/parse-job-storage";
import { routes } from "@/lib/routes";
import { useNavigate } from "@/lib/transitions";
import { isImageKitUrl, uploadImage } from "@/lib/upload/images";

const BELL_BUTTON_CLASS =
  "relative p-2 rounded-full bg-[rgba(255,170,50,0.08)] border border-[rgba(255,200,100,0.18)] outline-none focus-visible:outline-none [-webkit-tap-highlight-color:transparent]";

export function ParsedRecipesSheet() {
  const [open, setOpen] = useState(false);
  const parsed = useLiveQuery(() => db.parsedRecipes.toArray(), []);
  const syncCount =
    (useLiveQuery(() => db.notifications.count(), []) as number | undefined) ??
    0;
  const parsedCount = parsed?.length ?? 0;
  const totalCount = parsedCount + syncCount;

  const navigate = useNavigate();
  const params = useParams();
  const locale = params.locale as string;

  const handleSave = async (id: string) => {
    const entry = await db.parsedRecipes.get(id);
    if (!entry) return;

    const uploadToken = getPendingUploadToken() ?? undefined;
    const uploadOptions = uploadToken ? { uploadToken } : undefined;

    let imageUrl = entry.imageUrl;
    let imageFileId: string | undefined;

    if (imageUrl && !isImageKitUrl(imageUrl)) {
      try {
        const uploaded = await uploadImage(imageUrl, uploadOptions);
        imageUrl = uploaded.url;
        imageFileId = uploaded.fileId;
      } catch {}
    }

    await saveParsedRecipe({ ...entry, imageUrl, imageFileId }, uploadToken);
    await db.parsedRecipes.delete(id);
    toast.success("Recipe saved!");
  };

  const handleEdit = (id: string) => {
    db.parsedRecipes.get(id).then((entry) => {
      if (!entry) return;
      localStorage.setItem("parsedRecipe", JSON.stringify(entry));
      db.parsedRecipes.delete(id);
      navigate.push(routes.recipes.new(locale));
    });
  };

  const handleDismiss = async (id: string) => {
    await db.parsedRecipes.delete(id);
  };

  if (totalCount === 0) {
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
            {totalCount}
          </span>
        </button>
      </SheetTrigger>
      <SheetContent
        side="top"
        className="max-h-[80vh] overflow-y-auto rounded-b-2xl"
        aria-describedby={undefined}
      >
        <SheetHeader className="mb-4">
          <SheetTitle>Notifications</SheetTitle>
        </SheetHeader>
        <div className="space-y-3 px-4 pb-6">
          {syncCount > 0 && (
            <div className="p-4 rounded-xl space-y-2 bg-[rgba(255,170,50,0.08)] border border-[rgba(255,200,100,0.18)]">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium text-sm">
                  🔄 {syncCount} item{syncCount !== 1 ? "s" : ""} need sync
                  review
                </p>
                <Button
                  size="sm"
                  onClick={() => {
                    navigate.push(routes.syncReview(locale));
                    setOpen(false);
                  }}
                >
                  Review →
                </Button>
              </div>
            </div>
          )}

          {parsedCount > 0 && (
            <>
              {syncCount > 0 && (
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide pt-2">
                  Parsed Recipes
                </p>
              )}
              {parsed?.map((entry) => (
                <div
                  key={entry.id}
                  className="p-4 rounded-xl bg-muted space-y-2"
                >
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <p className="font-medium text-sm">{entry.title}</p>
                      {entry.category && (
                        <p className="text-xs text-muted-foreground">
                          {entry.category}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDismiss(entry.id)}
                      className="text-muted-foreground hover:text-foreground text-xs shrink-0"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleSave(entry.id)}
                      className="flex-1"
                    >
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(entry.id)}
                      className="flex-1"
                    >
                      Edit
                    </Button>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
