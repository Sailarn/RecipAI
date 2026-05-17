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
import { isImageKitUrl, uploadImage } from "@/lib/images";
import { routes } from "@/lib/routes";
import { useNavigate } from "@/lib/transitions";

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

    let imageUrl = entry.imageUrl;
    let imageFileId: string | undefined;

    if (imageUrl && !isImageKitUrl(imageUrl)) {
      try {
        const uploaded = await uploadImage(imageUrl);
        imageUrl = uploaded.url;
        imageFileId = uploaded.fileId;
      } catch {}
    }

    await saveParsedRecipe({ ...entry, imageUrl, imageFileId });
    await db.parsedRecipes.delete(id);
    toast.success("Recipe saved!");
  };

  const handleEdit = (id: string) => {
    db.parsedRecipes.get(id).then((entry) => {
      if (!entry) return;
      localStorage.setItem("parsedRecipe", JSON.stringify(entry));
      db.parsedRecipes.delete(id);
      const loc = window.location.pathname.split("/")[1];
      window.location.href = `/${loc}/recipes/new`;
    });
  };

  const handleDismiss = async (id: string) => {
    await db.parsedRecipes.delete(id);
  };

  if (totalCount === 0) return null;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          className="relative"
          style={{
            padding: 8,
            borderRadius: 99,
            background: "rgba(255,170,50,0.08)",
            border: "1px solid rgba(255,200,100,0.18)",
            cursor: "pointer",
            transition: "background 0.15s ease",
          }}
        >
          <BellIcon size={18} style={{ color: "var(--fg-1)" }} />
          <span
            style={{
              position: "absolute",
              top: -2,
              right: -2,
              background: "var(--action-primary)",
              color: "#fff",
              fontSize: 10,
              fontWeight: 700,
              borderRadius: 99,
              width: 16,
              height: 16,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
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
            <div
              className="p-4 rounded-xl space-y-2"
              style={{
                background: "rgba(255,170,50,0.08)",
                border: "1px solid rgba(255,200,100,0.18)",
              }}
            >
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
