import type { SyncNotification } from "@/lib/db/schema";
import { formatDate } from "../../sync-utils";
import { ActionButton } from "../action-button";
import { ItemCard } from "../item-card";
import { SectionHeader } from "../section-header";

interface ConflictedSectionProps {
  notifications: SyncNotification[];
  onSkip: (notif: SyncNotification) => void;
  onKeepMine: (notif: SyncNotification) => void;
  onTakeServerVersion: (notif: SyncNotification) => void;
}

function buildConflictMeta(notif: SyncNotification): string {
  const localSnapshot = JSON.parse(notif.localSnapshot ?? "{}");
  const serverSnapshot = JSON.parse(notif.serverSnapshot ?? "{}");
  const serverNewer =
    new Date(serverSnapshot.updatedAt).getTime() >
    new Date(localSnapshot.updatedAt).getTime();
  const deviceLabel = `Device: ${formatDate(localSnapshot.updatedAt)}${serverNewer ? "" : " (newer)"}`;
  const serverLabel = `Server: ${formatDate(serverSnapshot.updatedAt)}${serverNewer ? " (newer)" : ""}`;
  return `${deviceLabel} · ${serverLabel}`;
}

export function ConflictedSection({
  notifications,
  onSkip,
  onKeepMine,
  onTakeServerVersion,
}: ConflictedSectionProps) {
  return (
    <section>
      <SectionHeader title="Out of sync" count={notifications.length} />
      {notifications.map((notif) => (
        <ItemCard
          key={notif.id}
          notif={notif}
          metaText={buildConflictMeta(notif)}
        >
          <div className="flex gap-[6px] flex-wrap mt-2">
            <ActionButton
              label="Skip"
              onClick={() => onSkip(notif)}
              variant="ghost"
            />
            <ActionButton
              label="Keep mine"
              onClick={() => onKeepMine(notif)}
              variant="ghost"
            />
            <ActionButton
              label="Take server version"
              onClick={() => onTakeServerVersion(notif)}
            />
          </div>
        </ItemCard>
      ))}
    </section>
  );
}
