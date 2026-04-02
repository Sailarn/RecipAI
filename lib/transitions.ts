import { useRouter } from "next/navigation";

export function slideTransition() {
  document.documentElement.animate(
    [
      { opacity: 1, transform: "translateY(0)" },
      { opacity: 0, transform: "translateY(-8px)" },
    ],
    {
      duration: 150,
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
      duration: 150,
      easing: "ease",
      fill: "forwards",
      pseudoElement: "::view-transition-new(root)",
    },
  );
}

export function useNavigate() {
  const router = useRouter();
  return {
    push: (href: string) => router.push(href),
    back: () => router.back(),
    replace: (href: string) => router.replace(href),
  };
}
