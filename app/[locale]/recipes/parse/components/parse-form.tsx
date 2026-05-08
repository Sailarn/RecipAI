"use client";

import { AiButton } from "@/components/ui/ai-button";
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

      <AiButton
        onClick={onSubmit}
        disabled={!url}
        loading={loading}
        label="Import with AI"
        loadingLabel="Parsing recipe…"
      />
    </div>
  );
}
