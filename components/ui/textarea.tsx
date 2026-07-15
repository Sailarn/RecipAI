import type { TextareaHTMLAttributes } from "react";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

export function Textarea({ className = "", error, ...props }: TextareaProps) {
  return (
    <textarea
      className={`
        w-full rounded-[14px] px-3 py-2 border transition-colors
        focus:outline-none
        disabled:opacity-50 disabled:cursor-not-allowed
        resize-vertical
        ${error ? "border-red-500 focus:border-red-500" : ""}
        ${className}
      `}
      style={{
        background: "rgba(255,170,50,0.07)",
        borderColor: error ? undefined : "rgba(255,200,100,0.15)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        color: "var(--fg-1)",
        fontFamily: "var(--font-sans)",
        // text-base (16px), not --text-sm (14px) — keeps iOS Safari from
        // auto-zooming on focus.
        fontSize: "var(--text-base)",
      }}
      {...props}
    />
  );
}
