"use client";

import { ImageIcon, ImagePlus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import type { Control, FieldErrors, UseFormRegister } from "react-hook-form";
import { Input, Label, Textarea } from "@/components/ui";
import { RECIPE_CATEGORIES } from "@/lib/categories";
import type { RecipeFormData } from "./schema";

interface BasicInfoProps {
  register: UseFormRegister<RecipeFormData>;
  errors: FieldErrors<RecipeFormData>;
  control: Control<RecipeFormData>;
  onFileSelect: (file: File | null) => void;
}

const LABEL_STYLE: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  fontWeight: 600,
  color: "var(--fg-2)",
  marginBottom: 5,
};

const REQUIRED_STAR: React.CSSProperties = {
  color: "rgba(239,68,68,0.8)",
};

export function BasicInfo({
  register,
  errors,
  control,
  onFileSelect,
}: BasicInfoProps) {
  const t = useTranslations("recipeForm");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("");

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    if (!file) return;
    onFileSelect(file);
    setPreview(URL.createObjectURL(file));
  }

  function handleClearFile() {
    onFileSelect(null);
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <div className="space-y-4">
      {/* Title */}
      <div>
        <label htmlFor="title" style={LABEL_STYLE}>
          {t("title")}
          <span style={REQUIRED_STAR}> *</span>
        </label>
        <Input id="title" {...register("title")} error={!!errors.title} />
        {errors.title && (
          <p
            style={{
              fontSize: 11,
              color: "rgba(239,68,68,0.85)",
              marginTop: 4,
              paddingLeft: 2,
            }}
          >
            {errors.title.message}
          </p>
        )}
      </div>

      {/* Description */}
      <div>
        <label htmlFor="description" style={LABEL_STYLE}>
          {t("description")}
        </label>
        <Textarea id="description" {...register("description")} rows={3} />
      </div>

      {/* Category Picker */}
      <div>
        <div style={LABEL_STYLE}>{t("category")}</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
          {RECIPE_CATEGORIES.map((cat) => {
            const isActive = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => {
                  setSelectedCategory(isActive ? "" : cat);
                  // We use a hidden input to store the category value
                  const input = document.getElementById(
                    "category-input",
                  ) as HTMLInputElement;
                  if (input) input.value = isActive ? "" : cat;
                }}
                style={{
                  padding: "6px 13px",
                  borderRadius: 99,
                  font: "12px / var(--font-sans)",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  ...(isActive
                    ? {
                        background: "rgba(255,180,60,0.20)",
                        border: "1px solid rgba(255,210,120,0.45)",
                        color: "var(--fg-1)",
                        fontWeight: 600,
                        boxShadow: "0 0 10px rgba(255,180,60,0.18)",
                      }
                    : {
                        background: "rgba(255,170,50,0.07)",
                        border: "1px solid rgba(255,200,100,0.14)",
                        color: "var(--fg-2)",
                        fontWeight: 500,
                      }),
                }}
              >
                {cat}
              </button>
            );
          })}
        </div>
        {/* Hidden input to store category value for react-hook-form */}
        <input
          id="category-input"
          type="hidden"
          {...register("category")}
          value={selectedCategory}
        />
      </div>

      {/* Image URL Row */}
      <div>
        <label htmlFor="imageUrl" style={LABEL_STYLE}>
          {t("imageUrl")}
        </label>
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ flex: 1 }}>
            <Input
              id="imageUrl"
              {...register("imageUrl")}
              type="url"
              error={!!errors.imageUrl}
            />
          </div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            style={{
              width: 42,
              height: 42,
              borderRadius: 12,
              background: "rgba(255,170,50,0.09)",
              border: "1px solid rgba(255,200,100,0.18)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              flexShrink: 0,
            }}
            title="Upload from device"
          >
            <ImageIcon size={16} style={{ color: "var(--fg-2)" }} />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
        {errors.imageUrl && (
          <p
            style={{
              fontSize: 11,
              color: "rgba(239,68,68,0.85)",
              marginTop: 4,
              paddingLeft: 2,
            }}
          >
            {errors.imageUrl.message}
          </p>
        )}
        {preview && (
          <div
            style={{
              position: "relative",
              marginTop: 8,
              width: 96,
              height: 96,
              borderRadius: 12,
              overflow: "hidden",
              border: "1px solid rgba(255,200,100,0.18)",
            }}
          >
            {/* biome-ignore lint/performance/noImgElement: preview uses blob URL */}
            <img
              src={preview}
              alt="Preview"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
            <button
              type="button"
              onClick={handleClearFile}
              style={{
                position: "absolute",
                top: 4,
                right: 4,
                background: "rgba(0,0,0,0.6)",
                borderRadius: "50%",
                padding: 2,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "none",
                cursor: "pointer",
              }}
            >
              <X size={12} color="white" />
            </button>
          </div>
        )}
      </div>

      {/* Number Grid: Prep / Cook / Servings */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 10,
        }}
      >
        <div>
          <label htmlFor="prepTime" style={{ ...LABEL_STYLE, fontSize: 11 }}>
            {t("prepTime")}
          </label>
          <Input
            id="prepTime"
            {...register("prepTime", {
              setValueAs: (v) => {
                if (v === "" || v === null || v === undefined) return undefined;
                const n = Number(v);
                return Number.isNaN(n) ? undefined : n;
              },
            })}
            type="number"
            step="0.01"
            style={{ textAlign: "center" }}
          />
        </div>
        <div>
          <label htmlFor="cookTime" style={{ ...LABEL_STYLE, fontSize: 11 }}>
            {t("cookTime")}
          </label>
          <Input
            id="cookTime"
            {...register("cookTime", {
              setValueAs: (v) => {
                if (v === "" || v === null || v === undefined) return undefined;
                const n = Number(v);
                return Number.isNaN(n) ? undefined : n;
              },
            })}
            type="number"
            step="0.01"
            style={{ textAlign: "center" }}
          />
        </div>
        <div>
          <label htmlFor="servings" style={{ ...LABEL_STYLE, fontSize: 11 }}>
            {t("servings")}
            <span style={REQUIRED_STAR}> *</span>
          </label>
          <Input
            id="servings"
            {...register("servings")}
            type="number"
            error={!!errors.servings}
            style={{ textAlign: "center" }}
          />
          {errors.servings && (
            <p
              style={{
                fontSize: 11,
                color: "rgba(239,68,68,0.85)",
                marginTop: 4,
                paddingLeft: 2,
              }}
            >
              {errors.servings.message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
