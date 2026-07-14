"use client";

import { ChevronDown, Pencil, X } from "lucide-react";
import { type ReactNode, useState } from "react";
import type { RecipeSection } from "@/lib/db/schema";

interface SectionContainerProps {
  section: RecipeSection;
  stepCountLabel: string;
  isEditing: boolean;
  children: ReactNode;
  onRename: (name: string) => void;
  onRenameRequest: () => void;
  onDelete: () => void;
  sectionNamePlaceholder: string;
  toggleLabel: string;
  renameLabel: string;
  deleteLabel: string;
}

export function SectionContainer({
  section,
  stepCountLabel,
  isEditing,
  children,
  onRename,
  onRenameRequest,
  onDelete,
  sectionNamePlaceholder,
  toggleLabel,
  renameLabel,
  deleteLabel,
}: SectionContainerProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  return (
    <section
      data-testid="section-container"
      className="rounded-[18px] border border-[var(--glass-card-border)] bg-[var(--glass-card-bg)] p-3"
    >
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label={toggleLabel}
          onClick={() => setIsCollapsed((collapsed) => !collapsed)}
          className="p-0 text-[var(--fg-3)]"
        >
          <ChevronDown size={16} className={isCollapsed ? "-rotate-90" : ""} />
        </button>
        {isEditing ? (
          <input
            // biome-ignore lint/a11y/noAutofocus: creating a section immediately opens its name field
            autoFocus
            defaultValue={section.name}
            aria-label={sectionNamePlaceholder}
            placeholder={sectionNamePlaceholder}
            className="min-w-0 flex-1 rounded-[8px] border border-[var(--action-primary)] bg-transparent px-2 py-1 text-[13px] text-[var(--fg-1)] outline-none"
            onBlur={(event) => onRename(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.currentTarget.blur();
            }}
          />
        ) : (
          <span className="min-w-0 flex-1 text-[13px] font-semibold text-[var(--fg-1)]">
            {section.name}
          </span>
        )}
        <span className="text-[11px] text-[var(--fg-3)]">{stepCountLabel}</span>
        <button
          type="button"
          aria-label={renameLabel}
          onClick={onRenameRequest}
          className="p-1 text-[var(--fg-3)]"
        >
          <Pencil size={14} />
        </button>
        <button
          type="button"
          data-testid="delete-section"
          aria-label={deleteLabel}
          onClick={onDelete}
          className="p-1 text-[var(--action-destructive)]"
        >
          <X size={14} />
        </button>
      </div>
      {!isCollapsed && (
        <div className="mt-3 flex flex-col gap-2">{children}</div>
      )}
    </section>
  );
}
