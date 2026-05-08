import type { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export function Input({ className = "", error, style, ...props }: InputProps) {
  return (
    <input
      className={`
        w-full rounded-[14px] px-3 py-2 border transition-colors
        focus:outline-none
        disabled:opacity-50 disabled:cursor-not-allowed
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
        fontSize: "var(--text-base)",
        ...style,
      }}
      {...props}
    />
  );
}
