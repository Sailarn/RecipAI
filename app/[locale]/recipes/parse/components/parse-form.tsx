"use client";

import { AiButton } from "@/components/ui/ai-button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface ParseFormProps {
  url: string;
  onUrlChange: (value: string) => void;
  userComment: string;
  onCommentChange: (value: string) => void;
  loading: boolean;
  error: string | null;
  onSubmit: () => void;
}

const LABEL_CLASSES =
  "block font-sans text-[12px] font-medium text-[var(--fg-2)] mb-[5px]";

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
        <label htmlFor="url" className={LABEL_CLASSES}>
          Recipe URL
        </label>
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
        <label htmlFor="comment" className={LABEL_CLASSES}>
          Hints for AI{" "}
          <span className="text-[var(--fg-3)] font-normal">
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
