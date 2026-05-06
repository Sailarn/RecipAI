"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface ParseFormProps {
  url: string;
  onUrlChange: (v: string) => void;
  userComment: string;
  onCommentChange: (v: string) => void;
  loading: boolean;
  error: string | null;
  onSubmit: () => void;
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontFamily: "var(--font-sans)",
  fontSize: 12,
  fontWeight: 500,
  color: "var(--fg-2)",
  marginBottom: 5,
};

export function ParseForm({
  url,
  onUrlChange,
  userComment,
  onCommentChange,
  loading,
  error,
  onSubmit,
}: ParseFormProps) {
  const enabled = !!url && !loading;

  return (
    <div className="space-y-4 mb-6">
      <div>
        <label htmlFor="url" style={labelStyle}>Recipe URL</label>
        <Input
          id="url"
          type="url"
          placeholder="https://silpo.ua/recipes/..."
          value={url}
          onChange={(e) => onUrlChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onSubmit()}
          disabled={loading}
        />
      </div>

      <div>
        <label htmlFor="comment" style={labelStyle}>
          Hints for AI{" "}
          <span style={{ color: "var(--fg-3)", fontWeight: 400 }}>
            optional — e.g. "Ingredients are in grams"
          </span>
        </label>
        <Textarea
          id="comment"
          placeholder="Any hints to help parse correctly..."
          value={userComment}
          onChange={(e) => onCommentChange(e.target.value)}
          disabled={loading}
          rows={2}
        />
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* AI Import button */}
      <button
        type="button"
        onClick={onSubmit}
        disabled={!enabled}
        style={{
          position: "relative",
          overflow: "hidden",
          width: "100%",
          borderRadius: 20,
          padding: "14px 16px",
          cursor: enabled ? "pointer" : "not-allowed",
          border: `1px solid ${enabled ? "rgba(139,92,246,0.45)" : "rgba(139,92,246,0.20)"}`,
          background:
            "linear-gradient(135deg, rgba(24,20,60,0.97), rgba(42,12,90,0.93), rgba(24,20,60,0.97))",
          backgroundSize: "200% 200%",
          animation: enabled && !loading ? "aiGrad 4s ease infinite" : "none",
          boxShadow: enabled
            ? "0 0 28px rgba(139,92,246,0.3), 0 4px 16px rgba(0,0,0,0.5)"
            : "none",
          opacity: enabled ? 1 : 0.5,
          transition: "opacity 0.2s ease, border-color 0.2s ease",
        }}
      >
        {/* Shimmer overlay — only when enabled and not loading */}
        {enabled && !loading && (
          <span
            aria-hidden
            style={{
              position: "absolute",
              top: 0,
              left: "-100%",
              width: "55%",
              height: "100%",
              background:
                "linear-gradient(90deg, transparent, rgba(167,139,250,0.2), transparent)",
              animation: "aiShimmer 3s ease-in-out infinite",
              pointerEvents: "none",
              zIndex: 1,
            }}
          />
        )}

        {/* Content */}
        <span
          style={{
            position: "relative",
            zIndex: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 9,
          }}
        >
          {loading ? (
            <>
              <span
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: "50%",
                  border: "2px solid rgba(221,214,254,0.3)",
                  borderTopColor: "#ede9fe",
                  animation: "spin 0.7s linear infinite",
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  color: "#ede9fe",
                  fontSize: 14,
                  fontWeight: 600,
                  fontFamily: "var(--font-sans)",
                }}
              >
                Parsing recipe…
              </span>
            </>
          ) : (
            <>
              <span style={{ fontSize: 16 }}>✨</span>
              <span
                style={{
                  color: "#ede9fe",
                  fontSize: 14,
                  fontWeight: 700,
                  fontFamily: "var(--font-sans)",
                }}
              >
                Import with AI
              </span>
            </>
          )}
        </span>
      </button>
    </div>
  );
}
