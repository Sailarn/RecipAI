import type { LabelHTMLAttributes } from "react";

interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
}

export function Label({
  children,
  required,
  className = "",
  ...props
}: LabelProps) {
  return (
    <label
      className={`block mb-1.5 ${className}`}
      style={{ font: "var(--type-label)", color: "var(--fg-1)" }}
      {...props}
    >
      {children}
      {required && (
        <span style={{ color: "var(--action-destructive)" }} className="ml-1">*</span>
      )}
    </label>
  );
}
