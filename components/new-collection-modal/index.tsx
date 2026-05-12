"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

const EMOJIS = [
  "⭐",
  "🍳",
  "🥗",
  "🍰",
  "🎉",
  "🌿",
  "🔥",
  "💪",
  "🌍",
  "❤️",
  "🥡",
  "☕",
];

interface NewCollectionModalProps {
  onClose: () => void;
  onCreate: (data: { name: string; emoji: string }) => void;
}

export function NewCollectionModal({
  onClose,
  onCreate,
}: NewCollectionModalProps) {
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("⭐");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  function handleCreate() {
    if (!name.trim()) return;
    onCreate({ name: name.trim(), emoji });
    onClose();
  }

  if (!mounted) return null;

  return createPortal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 500,
        display: "flex",
        alignItems: "flex-end",
      }}
    >
      {/* Backdrop */}
      <button
        type="button"
        data-testid="modal-backdrop"
        onClick={onClose}
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,0,0,0.55)",
          backdropFilter: "blur(4px)",
          border: "none",
          cursor: "pointer",
          padding: 0,
        }}
      />

      {/* Sheet */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          width: "100%",
          background: "rgba(18,14,8,0.92)",
          backdropFilter: "blur(32px) saturate(200%)",
          WebkitBackdropFilter: "blur(32px) saturate(200%)",
          border: "1px solid rgba(255,200,100,0.18)",
          borderRadius: "28px 28px 0 0",
          padding: "20px 18px 36px",
          boxShadow:
            "0 -8px 40px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,220,130,0.12)",
        }}
      >
        {/* Drag handle */}
        <div
          style={{
            width: 36,
            height: 4,
            borderRadius: 2,
            background: "rgba(255,200,100,0.25)",
            margin: "0 auto 18px",
          }}
        />

        {/* Title */}
        <div
          style={{
            fontSize: 16,
            fontWeight: 700,
            color: "var(--fg-1)",
            fontFamily: "var(--font-display)",
            marginBottom: 16,
          }}
        >
          New Collection
        </div>

        {/* Emoji picker */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            marginBottom: 16,
          }}
        >
          {EMOJIS.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => setEmoji(e)}
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                fontSize: 18,
                cursor: "pointer",
                border:
                  emoji === e
                    ? "1px solid rgba(255,210,120,0.45)"
                    : "1px solid rgba(255,200,100,0.12)",
                background:
                  emoji === e
                    ? "rgba(255,180,60,0.22)"
                    : "rgba(255,170,50,0.07)",
                boxShadow:
                  emoji === e ? "0 0 10px rgba(255,180,60,0.2)" : "none",
                transition: "all 0.15s ease",
              }}
            >
              {e}
            </button>
          ))}
        </div>

        {/* Name input */}
        <input
          type="text"
          placeholder="Collection name…"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{
            width: "100%",
            padding: "11px 14px",
            borderRadius: 14,
            border: name
              ? "1px solid rgba(255,200,100,0.30)"
              : "1px solid rgba(255,200,100,0.15)",
            background: "rgba(255,170,50,0.08)",
            backdropFilter: "blur(12px)",
            color: "var(--fg-1)",
            fontSize: 14,
            fontFamily: "var(--font-sans)",
            outline: "none",
            marginBottom: 14,
            boxSizing: "border-box",
            transition: "border-color 0.2s",
          }}
        />

        {/* Buttons */}
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              flex: 1,
              padding: 9,
              background: "rgba(255,170,50,0.06)",
              color: "var(--fg-2)",
              border: "1px solid rgba(255,200,100,0.12)",
              borderRadius: 12,
              fontSize: 13,
              fontWeight: 500,
              fontFamily: "var(--font-sans)",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleCreate}
            disabled={!name.trim()}
            style={{
              flex: 2,
              padding: 13,
              fontSize: 14,
              fontWeight: 700,
              border: "none",
              borderRadius: 16,
              fontFamily: "var(--font-sans)",
              cursor: name.trim() ? "pointer" : "default",
              background: name.trim() ? "#3b82f6" : "rgba(59,130,246,0.25)",
              color: name.trim() ? "#fff" : "rgba(255,255,255,0.35)",
              boxShadow: name.trim()
                ? "0 4px 20px rgba(59,130,246,0.45)"
                : "none",
              transition: "all 0.2s ease",
            }}
          >
            Create
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
