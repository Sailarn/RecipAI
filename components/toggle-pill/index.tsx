import type { LucideIcon } from "lucide-react";
import "./toggle-pill.css";

const ICON_SIZE = 10;
const ICON_STROKE_WIDTH = 2;

interface TogglePillProps {
  checked: boolean;
  offIcon: LucideIcon;
  onIcon: LucideIcon;
}

export function TogglePill({
  checked,
  offIcon: OffIcon,
  onIcon: OnIcon,
}: TogglePillProps) {
  const ActiveIcon = checked ? OnIcon : OffIcon;

  return (
    <div className="toggle-pill" data-on={checked}>
      <div className="toggle-pill__circle">
        <ActiveIcon size={ICON_SIZE} strokeWidth={ICON_STROKE_WIDTH} />
      </div>
    </div>
  );
}
