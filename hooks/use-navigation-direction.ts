import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getNavigationDirection } from "@/lib/transitions";

export function useNavigationDirection() {
  const _pathname = usePathname();
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  console.log("direction:", direction);

  useEffect(() => {
    setDirection(getNavigationDirection());
  }, []);

  return direction;
}
