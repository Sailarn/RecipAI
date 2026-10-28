/**
 * @vitest-environment happy-dom
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const IK = "https://ik.test/";

// The placeholder is read once at module load, so it must be set before the
// component is imported.
vi.hoisted(() => {
  process.env.NEXT_PUBLIC_PLACEHOLDER_IMAGE_URL =
    "https://ik.test/placeholder.png";
});

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT", IK);
});

import { RecipeImage } from "../index";

function image() {
  return screen.getByRole("img") as HTMLImageElement;
}

describe("RecipeImage", () => {
  describe("source selection", () => {
    it("requests an optimized ImageKit url", () => {
      render(<RecipeImage imageUrl={`${IK}a.jpg`} title="Soup" width={400} />);

      expect(image().getAttribute("src")).toBe(
        `${IK}a.jpg?tr=w-400,f-webp,q-80`,
      );
    });

    it("never requests a non-ImageKit source url", () => {
      render(
        <RecipeImage imageUrl="https://cdn.tiktok.test/x.jpg" title="Soup" />,
      );

      expect(image().getAttribute("src")).toContain("placeholder.png");
    });

    it("falls back after a load error", () => {
      render(<RecipeImage imageUrl={`${IK}a.jpg`} title="Soup" />);

      fireEvent.error(image());

      expect(image().getAttribute("src")).toContain("placeholder.png");
    });

    it("shows a new image after the previous one failed", () => {
      const { rerender } = render(
        <RecipeImage imageUrl={`${IK}a.jpg`} title="Soup" />,
      );
      fireEvent.error(image());

      rerender(<RecipeImage imageUrl={`${IK}b.jpg`} title="Soup" />);

      expect(image().getAttribute("src")).toContain("b.jpg");
    });
  });

  describe("loading hints", () => {
    it("lazy-loads by default", () => {
      render(<RecipeImage imageUrl={`${IK}a.jpg`} title="Soup" />);

      expect(image()).toHaveAttribute("loading", "lazy");
      expect(image()).toHaveAttribute("fetchpriority", "auto");
    });

    it("loads a priority image eagerly at high priority", () => {
      render(<RecipeImage imageUrl={`${IK}a.jpg`} title="Soup" priority />);

      expect(image()).toHaveAttribute("loading", "eager");
      expect(image()).toHaveAttribute("fetchpriority", "high");
    });

    it("lets an explicit loading prop win", () => {
      render(
        <RecipeImage imageUrl={`${IK}a.jpg`} title="Soup" loading="eager" />,
      );

      expect(image()).toHaveAttribute("loading", "eager");
    });
  });

  describe("crop", () => {
    it("scales and offsets the crop window and re-centres the focal point", () => {
      render(
        <RecipeImage
          imageUrl={`${IK}a.jpg`}
          title="Soup"
          objectPosition="50% 50%"
          imageCropX={25}
          imageCropY={0}
          imageCropWidth={50}
          imageCropHeight={100}
        />,
      );
      const frame = image().parentElement?.parentElement as HTMLElement;

      expect(frame.style.width).toBe("200%");
      expect(frame.style.height).toBe("100%");
      expect(frame.style.left).toBe("-50%");
      expect(image().style.objectPosition).toBe("50% 50%");
    });

    it("ignores a zero-size crop", () => {
      render(
        <RecipeImage
          imageUrl={`${IK}a.jpg`}
          title="Soup"
          objectPosition="10% 20%"
          imageCropWidth={0}
          imageCropHeight={0}
        />,
      );

      expect(image().style.objectPosition).toBe("10% 20%");
    });
  });
});
