import { callAiForRecipe } from "@/lib/ai";
import type { ParsedRecipe } from "@/lib/db/schema";
import { fetchInstagramReel } from "@/lib/scrapers/apify";
import { transcribeWithGroq } from "@/lib/transcribe/groq";
import { isInstagramUrl } from "@/lib/video-url";
import { buildTranscriptPrompt } from "./prompts";
import { requireCompleteRecipe } from "./recipe-result";

const MIN_TRANSCRIPT_LENGTH = 30;

export async function parseVideoRecipe(url: string): Promise<ParsedRecipe> {
  if (!isInstagramUrl(url)) {
    throw new Error(
      "Unsupported video platform. Currently only Instagram Reels are supported.",
    );
  }

  const { videoUrl, thumbnailUrl, caption, isAudio } =
    await fetchInstagramReel(url);

  const videoRes = await fetch(videoUrl);
  if (!videoRes.ok) throw new Error(`Video fetch failed: ${videoRes.status}`);
  const videoBuffer = await videoRes.arrayBuffer();

  let transcript = await transcribeWithGroq(videoBuffer, isAudio);

  // if transcript is empty or too short, fall back to caption only
  if (transcript.length < MIN_TRANSCRIPT_LENGTH) {
    if (!caption) {
      throw new Error(
        "No speech detected in video and no caption available. Cannot extract recipe.",
      );
    }
    transcript = "";
  }

  const prompt = buildTranscriptPrompt(transcript, caption);
  const recipe = requireCompleteRecipe(await callAiForRecipe(prompt), "page", {
    url,
  });

  if (!recipe.imageUrl) {
    recipe.imageUrl = thumbnailUrl;
  }

  return { ...recipe, sourceUrl: url };
}
