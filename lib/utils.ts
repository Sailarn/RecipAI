import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateId(): string {
  // Production is always served over https (a secure context), so
  // crypto.randomUUID is available there — and we never want the weaker
  // Math.random fallback minting real ids. The fallback exists only for the
  // local dev server, which runs over http on the LAN (an insecure context
  // where crypto.randomUUID is undefined).
  const isDev = process.env.NODE_ENV === "development";
  if (
    !isDev ||
    (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function")
  ) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const random = (Math.random() * 16) | 0;
    return (char === "x" ? random : (random & 0x3) | 0x8).toString(16);
  });
}
