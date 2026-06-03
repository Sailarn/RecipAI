export const CONTEXT_MENU_WIDTH = 200;
export const CONTEXT_MENU_HEIGHT = 160;
export const CONTEXT_MENU_MARGIN = 8;

export function clampMenuPos(x: number, y: number) {
  return {
    x: Math.min(
      x,
      window.innerWidth - CONTEXT_MENU_WIDTH - CONTEXT_MENU_MARGIN,
    ),
    y: Math.min(
      y,
      window.innerHeight - CONTEXT_MENU_HEIGHT - CONTEXT_MENU_MARGIN,
    ),
  };
}
