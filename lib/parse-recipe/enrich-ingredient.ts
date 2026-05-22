import { api } from "@/lib/routes";

export async function enrichIngredient(
  id: string,
  rawText: string,
  ua?: string | null,
  category?: string | null,
): Promise<void> {
  await fetch(api.ingredientsEnrich, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, rawText, ua, category }),
  });
}
