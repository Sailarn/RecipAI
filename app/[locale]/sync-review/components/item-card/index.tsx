import type { SyncNotification } from "@/lib/db/schema";

function getDisplayName(notif: SyncNotification): string {
  const snapshot = notif.serverSnapshot ?? notif.localSnapshot;
  if (!snapshot) return notif.entityId;
  const parsed = JSON.parse(snapshot);
  if (notif.entityType === "recipe") return parsed.title ?? notif.entityId;
  return `${parsed.emoji ?? ""} ${parsed.name ?? notif.entityId}`.trim();
}

interface ItemCardProps {
  notif: SyncNotification;
  metaText?: string;
  children: React.ReactNode;
}

export function ItemCard({ notif, metaText, children }: ItemCardProps) {
  return (
    <div className="bg-[rgba(255,170,50,0.06)] border border-[rgba(255,200,100,0.14)] rounded-[16px] px-[14px] py-3 mb-2">
      <div className="flex justify-between items-start mb-1">
        <span className="font-semibold text-[14px] text-[var(--fg-1)]">
          {getDisplayName(notif)}
        </span>
        <span className="text-[11px] text-[var(--fg-3)] bg-[rgba(255,200,100,0.1)] rounded-full py-[2px] px-2">
          {notif.entityType}
        </span>
      </div>
      {metaText && (
        <p className="text-[12px] text-[var(--fg-3)] mb-1">{metaText}</p>
      )}
      {children}
    </div>
  );
}
