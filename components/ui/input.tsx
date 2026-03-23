import type { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export function Input({ className = "", error, ...props }: InputProps) {
  return (
    <input
      className={`
        w-full rounded-md px-3 py-2 border transition-colors
        bg-[var(--input-bg)] 
        text-[var(--foreground)]
        border-[var(--input-border)]
        hover:border-[var(--input-border-hover)]
        focus:border-[var(--input-border-focus)]
        focus:outline-none
        disabled:opacity-50 disabled:cursor-not-allowed
        ${error ? "border-red-500 focus:border-red-500" : ""}
        ${className}
      `}
      {...props}
    />
  );
}
