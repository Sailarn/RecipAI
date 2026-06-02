export const COLLECTION_EMOJIS = [
  "⭐",
  "🍳",
  "🥗",
  "🍰",
  "🎉",
  "🌿",
  "🔥",
  "💪",
  "🌍",
  "❤️",
  "🥡",
  "☕",
];

interface EmojiPickerProps {
  emojis?: string[];
  selected: string;
  onSelect: (emoji: string) => void;
}

export function EmojiPicker({
  emojis = COLLECTION_EMOJIS,
  selected,
  onSelect,
}: EmojiPickerProps) {
  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {emojis.map((emoji) => {
        const isSelected = emoji === selected;
        return (
          <button
            key={emoji}
            type="button"
            onClick={() => onSelect(emoji)}
            className={`w-10 h-10 rounded-xl text-lg cursor-pointer transition-all duration-150 border ${
              isSelected
                ? "border-[rgba(255,210,120,0.45)] bg-[rgba(255,180,60,0.22)] shadow-[0_0_10px_rgba(255,180,60,0.2)]"
                : "border-[rgba(255,200,100,0.12)] bg-[rgba(255,170,50,0.07)]"
            }`}
          >
            {emoji}
          </button>
        );
      })}
    </div>
  );
}
