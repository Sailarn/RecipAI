"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { BellIcon } from "lucide-react";
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

export function ParsedRecipesSheet() {
  const [open, setOpen] = useState(false);
  const parsed = useLiveQuery(() => db.parsedRecipes.toArray(), []);
  const count = parsed?.length ?? 0;

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
      } catch { }
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
      const locale = window.location.pathname.split("/")[1];
      window.location.href = `/${locale}/recipes/new`;
    });
  };

  const handleDismiss = async (id: string) => {
    await db.parsedRecipes.delete(id);
  };

  if (count === 0) return null;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          className="relative p-2 rounded-full hover:bg-muted transition-colors"
        >
          <BellIcon className="w-5 h-5" />
          <span className="absolute -top-0.5 -right-0.5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
            {count}
          </span>
        </button>
      </SheetTrigger>
      <SheetContent
        side="top"
        className="max-h-[80vh] overflow-y-auto rounded-b-2xl"
      >
        <SheetHeader className="mb-4">
          <SheetTitle>Parsed Recipes</SheetTitle>
        </SheetHeader>
        <div className="space-y-3 pb-6">
          {parsed?.map((entry) => (
            <div key={entry.id} className="p-4 rounded-xl bg-muted space-y-2">
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
        </div>
      </SheetContent>
    </Sheet>
  );
}
