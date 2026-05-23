import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useNavigationStack } from "@/lib/navigation-stack";

export function useNavigate() {
  const router = useRouter();
  const stack = useNavigationStack();

  return {
    push: (href: string, element?: ReactNode) => {
      if (element !== undefined) {
        stack.push(href, element);
      } else {
        router.push(href);
      }
    },
    back: (fallback?: string) => {
      if (stack.canPop) {
        stack.pop();
      } else if (fallback) {
        router.replace(fallback);
      } else {
        router.back();
      }
    },
    reset: (href: string, element?: ReactNode) => {
      if (element !== undefined) {
        stack.reset(href, element);
      } else {
        router.push(href);
      }
    },
    replace: (href: string) => router.replace(href),
  };
}
