import { Moon, Sun } from "lucide-react";
import "./toggle-pill.css";

const ICON_SIZE = 10;
const ICON_STROKE_WIDTH = 2;

export function TogglePill({ checked }: { checked: boolean }) {
  return (
    <div className="toggle-pill" data-on={checked}>
      <div className="toggle-pill__circle">
        {checked ? (
          <Moon size={ICON_SIZE} strokeWidth={ICON_STROKE_WIDTH} />
        ) : (
          <Sun size={ICON_SIZE} strokeWidth={ICON_STROKE_WIDTH} />
        )}
      </div>
    </div>
  );
}
