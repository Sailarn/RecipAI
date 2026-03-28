import { useTransitionRouter } from "next-view-transitions";

export function slideTransition() {
  document.documentElement.animate(
    [
      { opacity: 1, transform: "translateY(0)" },
      { opacity: 0, transform: "translateY(-8px)" },
    ],
    {
      duration: 250,
      easing: "ease",
      fill: "forwards",
      pseudoElement: "::view-transition-old(root)",
    },
  );
  document.documentElement.animate(
    [
      { opacity: 0, transform: "translateY(8px)" },
      { opacity: 1, transform: "translateY(0)" },
    ],
    {
      duration: 250,
      easing: "ease",
      fill: "forwards",
      pseudoElement: "::view-transition-new(root)",
    },
  );
}

export function useNavigate() {
  const router = useTransitionRouter();
  return {
    push: (href: string) => {
      try {
        router.push(href, { onTransitionReady: slideTransition });
      } catch {
        router.push(href);
      }
    },
    back: () => router.back(),
    replace: (href: string) => {
      try {
        router.replace(href, { onTransitionReady: slideTransition });
      } catch {
        router.replace(href);
      }
    },
  };
}
