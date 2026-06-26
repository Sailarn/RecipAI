export const GROQ_MAX_BYTES = 24 * 1024 * 1024;

export async function transcribeWithGroq(
  audio: ArrayBuffer,
  isAudio = false,
): Promise<string> {
  if (audio.byteLength > GROQ_MAX_BYTES) {
    throw new Error(
      "Audio file too large for transcription (>24MB). Video may be too long.",
    );
  }

  const mimeType = isAudio ? "audio/mpeg" : "video/mp4";
  const fileName = isAudio ? "audio.mp3" : "audio.mp4";

  const blob = new Blob([audio], { type: mimeType });
  const form = new FormData();
  form.append("file", blob, fileName);
  form.append("model", "whisper-large-v3");
  form.append("response_format", "text");

  const res = await fetch(
    "https://api.groq.com/openai/v1/audio/transcriptions",
    {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
      body: form,
    },
  );

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Groq transcription failed: ${res.status} — ${errorBody}`);
  }

  return (await res.text()).trim();
}
