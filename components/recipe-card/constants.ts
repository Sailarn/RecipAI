/** compact: the phone grid card (image strip + footer below).
 *  tile: square wide-screen card, image fills it with the footer overlaid. */
export type CardLayout = "compact" | "tile";

// Rendered thumbnail width per layout; tiles are ~2x wider than phone cards.
export const THUMBNAIL_IMAGE_WIDTH: Record<CardLayout, number> = {
  compact: 300,
  tile: 640,
};

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
