import type { CatOption } from "../constants";

export interface CategoryStyle {
  dot: string;
  selectedTile: string;
  selectedControl: string;
}

export const CATEGORY_STYLES: Record<CatOption, CategoryStyle> = {
  Produce: {
    dot: "bg-[#86efac] shadow-[0_0_6px_#86efac]",
    selectedTile: "bg-[rgba(134,239,172,0.12)] border-[#86efac]/40",
    selectedControl: "bg-[#86efac] border-[#86efac]",
  },
  Dairy: {
    dot: "bg-[#fbe36b] shadow-[0_0_6px_#fbe36b]",
    selectedTile: "bg-[rgba(251,227,107,0.12)] border-[#fbe36b]/40",
    selectedControl: "bg-[#fbe36b] border-[#fbe36b]",
  },
  Pantry: {
    dot: "bg-[#fca5a5] shadow-[0_0_6px_#fca5a5]",
    selectedTile: "bg-[rgba(252,165,165,0.12)] border-[#fca5a5]/40",
    selectedControl: "bg-[#fca5a5] border-[#fca5a5]",
  },
  Spices: {
    dot: "bg-[#c4b5fd] shadow-[0_0_6px_#c4b5fd]",
    selectedTile: "bg-[rgba(196,181,253,0.12)] border-[#c4b5fd]/40",
    selectedControl: "bg-[#c4b5fd] border-[#c4b5fd]",
  },
  Frozen: {
    dot: "bg-[#93c5fd] shadow-[0_0_6px_#93c5fd]",
    selectedTile: "bg-[rgba(147,197,253,0.12)] border-[#93c5fd]/40",
    selectedControl: "bg-[#93c5fd] border-[#93c5fd]",
  },
  Other: {
    dot: "bg-[#c9c4bc] shadow-[0_0_6px_#c9c4bc]",
    selectedTile: "bg-[rgba(201,196,188,0.12)] border-[#c9c4bc]/40",
    selectedControl: "bg-[#c9c4bc] border-[#c9c4bc]",
  },
};
