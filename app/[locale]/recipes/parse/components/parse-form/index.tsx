"use client";

import { AiButton } from "@/components/ui/ai-button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";

interface ParseFormProps {
  url: string;
  onUrlChange: (value: string) => void;
  loading: boolean;
  error: string | null;
  onSubmit: () => void;
}

const LABEL_CLASSES =
  "block font-sans text-[12px] font-medium text-[var(--fg-2)] mb-[5px]";

export function ParseForm({
  url,
  onUrlChange,
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
