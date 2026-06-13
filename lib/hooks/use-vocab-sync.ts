"use client";

import { useEffect } from "react";
import { pullVocab } from "@/lib/db/sync-vocab";

// Pull the shared vocabulary into Dexie on startup for every visitor, signed
// in or not. The GET is public, so anonymous users get the full vocab — with
// embeddings — enabling both Fuse and embedding matching offline. Signed-in
// users also re-pull via useSyncOnLogin (the watermark dedupes to a cheap
// delta), which additionally retries their stuck provisionals.
export function useVocabSync() {
  useEffect(() => {
    pullVocab().catch(() => {});
  }, []);
}
