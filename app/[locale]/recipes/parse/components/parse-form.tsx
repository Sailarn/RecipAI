"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
      <div className="space-y-1.5">
        <Label htmlFor="url">Recipe URL</Label>
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

      <div className="space-y-1.5">
        <Label htmlFor="comment">
          Hints for AI
          <span className="text-muted-foreground font-normal ml-2 text-xs">
            optional — e.g. "Ingredients are in grams"
          </span>
        </Label>
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

      <Button onClick={onSubmit} disabled={!url || loading} className="w-full">
        {loading ? "Parsing... (may take up to 60 seconds)" : "Parse Recipe"}
      </Button>
    </div>
  );
}
