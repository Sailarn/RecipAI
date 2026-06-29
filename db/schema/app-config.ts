import { boolean, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const GLOBAL_APP_CONFIG_ID = "global";

export const appConfig = pgTable("app_config", {
  id: text("id").primaryKey().default(GLOBAL_APP_CONFIG_ID),
  maintenanceEnabled: boolean("maintenance_enabled").default(false).notNull(),
  maintenanceMessage: text("maintenance_message"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
