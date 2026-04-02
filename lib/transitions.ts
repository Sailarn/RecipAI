import { useRouter } from "next/navigation";

export const nav = { direction: "forward" as "forward" | "back" };

export function getNavigationDirection() {
  return nav.direction;
}

export function useNavigate() {
  const router = useRouter();
  return {
    push: (href: string) => {
      nav.direction = "forward";
      router.push(href);
    },
    back: () => {
      nav.direction = "back";
      router.back();
    },
    replace: (href: string) => {
      nav.direction = "forward";
      router.replace(href);
    },
  };
}
