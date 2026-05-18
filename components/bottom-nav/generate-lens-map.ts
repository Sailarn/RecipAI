/**
 * Generates a radial displacement map on a canvas and returns it as a data URL.
 *
 * Encoding:
 *   R channel = horizontal displacement direction
 *   G channel = vertical displacement direction
 *   128 = no displacement (neutral)
 *
 * The map encodes OUTWARD displacement from the centre, which when fed into
 * feDisplacementMap causes the output pixel to sample from slightly further out
 * in the source — producing convex-lens magnification at the centre and
 * increasing radial warping toward the rim.
 *
 * Paired with scale=16 in feDisplacementMap the maximum displacement is 8 px.
 *
 * @param w  Canvas width  (default 64)
 * @param h  Canvas height (default 32 — approximately 2:1 to match the pill)
 */
export function generateLensMap(w = 64, h = 32): string {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  const imgData = ctx.createImageData(w, h);
  const { data } = imgData;
  const cx = w / 2;
  const cy = h / 2;

  // Inner fraction of the pill (radius < INNER) has zero distortion.
  // Distortion rises quadratically from INNER to the rim.
  // This concentrates the glass-edge effect at the perimeter, leaving the
  // centre completely clear.
  const INNER = 0.55;

  for (let py = 0; py < h; py++) {
    for (let px = 0; px < w; px++) {
      // Normalise independently per axis so the lens follows the pill's elliptical shape
      const nx = (px - cx) / cx; // −1 … +1
      const ny = (py - cy) / cy; // −1 … +1
      // r is clamped to 1 — corners of the rectangle map to the lens rim
      const r = Math.min(Math.sqrt(nx * nx + ny * ny), 1);
      // Annular strength: zero inside INNER, quadratic ramp from INNER → rim
      const outerFrac = r < INNER ? 0 : (r - INNER) / (1 - INNER);
      const strength = outerFrac * outerFrac;
      // Map outward displacement vector to [0, 255]
      const R = Math.round(127.5 + nx * strength * 127.5);
      const G = Math.round(127.5 + ny * strength * 127.5);
      const i = (py * w + px) * 4;
      data[i] = Math.max(0, Math.min(255, R));
      data[i + 1] = Math.max(0, Math.min(255, G));
      data[i + 2] = 128; // unused by feDisplacementMap but keeps it a valid image
      data[i + 3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas.toDataURL();
}
