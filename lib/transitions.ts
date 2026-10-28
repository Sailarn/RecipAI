import { useRouter } from "next/navigation";
import { type ReactNode, useMemo } from "react";
import { useNavigationStack } from "@/lib/navigation-stack";

export function useNavigate() {
  const router = useRouter();
  const { push, pop, reset, replaceTop, canPop } = useNavigationStack();

  // Stable across renders: effects and callbacks list `navigate` as a
  // dependency, and a fresh object each render restarted them on every
  // re-render (a background parse stopped polling, a redirect never fired).
  return useMemo(
    () => ({
      push: (href: string, element?: ReactNode) => {
        if (element !== undefined) {
          push(href, element);
        } else {
          router.push(href);
        }
      },
      back: (fallback?: string) => {
        if (canPop) {
          pop();
        } else if (fallback) {
          router.replace(fallback);
        } else {
          router.back();
        }
      },
      reset: (href: string, element?: ReactNode) => {
        if (element !== undefined) {
          reset(href, element);
        } else {
          router.push(href);
        }
      },
      replace: (href: string, element?: ReactNode) => {
        if (element !== undefined) {
          replaceTop(href, element);
        } else {
          router.replace(href);
        }
      },
    }),
    [router, push, pop, reset, replaceTop, canPop],
  );
}
