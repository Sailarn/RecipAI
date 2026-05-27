import type { SyncNotification } from "@/lib/db/schema";
import { formatDate } from "../../sync-utils";
import { ActionButton } from "../action-button";
import { ItemCard } from "../item-card";
import { SectionHeader } from "../section-header";

interface LocalOnlySectionProps {
  notifications: SyncNotification[];
  onUploadAll: () => void;
  onDeleteFromDevice: (notif: SyncNotification) => void;
  onUploadToServer: (notif: SyncNotification) => void;
}

export function LocalOnlySection({
  notifications,
  onUploadAll,
  onDeleteFromDevice,
  onUploadToServer,
}: LocalOnlySectionProps) {
  return (
    <section>
      <SectionHeader
        title="Not on server"
        count={notifications.length}
        action={<ActionButton label="Upload all" onClick={onUploadAll} />}
      />
      {notifications.map((notif) => {
        const snapshot = JSON.parse(notif.localSnapshot ?? "{}");
        return (
          <ItemCard
            key={notif.id}
            notif={notif}
            metaText={`On device since ${formatDate(snapshot.updatedAt)}`}
          >
            <div className="flex gap-[6px] flex-wrap mt-2">
              <ActionButton
                label="Delete from device"
                onClick={() => onDeleteFromDevice(notif)}
                variant="danger"
              />
              <ActionButton
                label="Upload to server"
                onClick={() => onUploadToServer(notif)}
              />
            </div>
          </ItemCard>
        );
      })}
    </section>
  );
}
