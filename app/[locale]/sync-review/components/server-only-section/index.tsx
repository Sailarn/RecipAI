import type { SyncNotification } from "@/lib/db/schema";
import { formatDate } from "../../sync-utils";
import { ActionButton } from "../action-button";
import { ItemCard } from "../item-card";
import { SectionHeader } from "../section-header";

interface ServerOnlySectionProps {
  notifications: SyncNotification[];
  onAddAll: () => void;
  onAddToDevice: (notif: SyncNotification) => void;
  onDeleteFromServer: (notif: SyncNotification) => void;
}

export function ServerOnlySection({
  notifications,
  onAddAll,
  onAddToDevice,
  onDeleteFromServer,
}: ServerOnlySectionProps) {
  return (
    <section>
      <SectionHeader
        title="Not on this device"
        count={notifications.length}
        action={<ActionButton label="Add all" onClick={onAddAll} />}
      />
      {notifications.map((notif) => {
        const snapshot = JSON.parse(notif.serverSnapshot ?? "{}");
        return (
          <ItemCard
            key={notif.id}
            notif={notif}
            metaText={`On server since ${formatDate(snapshot.updatedAt)}`}
          >
            <div className="flex gap-[6px] flex-wrap mt-2">
              <ActionButton
                label="Add to device"
                onClick={() => onAddToDevice(notif)}
              />
              <ActionButton
                label="Delete from server"
                onClick={() => onDeleteFromServer(notif)}
                variant="danger"
              />
            </div>
          </ItemCard>
        );
      })}
    </section>
  );
}
