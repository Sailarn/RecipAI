import { type NextRequest, NextResponse } from "next/server";
import { parseRecipeFromUrl } from "@/lib/parse-recipe";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const { url, userComment } = await request.json();
    if (!url)
      return NextResponse.json({ error: "URL is required" }, { status: 400 });

    const recipe = await parseRecipeFromUrl(url, userComment);

    return NextResponse.json({ success: true, recipe });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to parse recipe",
        success: false,
      },
      { status: 500 },
    );
  }
}
