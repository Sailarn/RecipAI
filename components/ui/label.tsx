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
      className={`block text-sm font-medium mb-1 text-[var(--foreground)] ${className}`}
      {...props}
    >
      {children}
      {required && <span className="text-red-500 ml-1">*</span>}
    </label>
  );
}
