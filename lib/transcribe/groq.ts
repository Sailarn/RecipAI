const GROQ_MAX_BYTES = 24 * 1024 * 1024;

export async function transcribeWithGroq(audio: ArrayBuffer): Promise<string> {
  if (audio.byteLength > GROQ_MAX_BYTES) {
    throw new Error(
      "Audio file too large for transcription (>24MB). Video may be too long.",
    );
  }

  const blob = new Blob([audio], { type: "video/mp4" });
  const form = new FormData();
  form.append("file", blob, "audio.mp4");
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
    const err = await res.text();
    throw new Error(`Groq transcription failed: ${res.status} — ${err}`);
  }

  return (await res.text()).trim();
}
