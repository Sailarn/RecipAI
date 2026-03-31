import { relations } from "drizzle-orm";
import { jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "./auth";

export const parseJobs = pgTable("parse_jobs", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  userComment: text("user_comment"),
  status: text("status").notNull().default("pending"), // pending | processing | done | failed
  result: jsonb("result"),
  error: text("error"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const parseJobsRelations = relations(parseJobs, ({ one }) => ({
  user: one(user, {
    fields: [parseJobs.userId],
    references: [user.id],
  }),
}));
