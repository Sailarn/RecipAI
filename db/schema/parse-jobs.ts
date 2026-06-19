import { relations } from "drizzle-orm";
import { index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { PARSE_JOB_STATUS, type ParseJobStatus } from "@/lib/db/schema";
import { user } from "./auth";

export const parseJobs = pgTable(
  "parse_jobs",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    // Stable cache key derived from `url` (see lib/parse-recipe/normalize-url).
    normalizedUrl: text("normalized_url"),
    // Pipeline version that produced `result`; set when the parse completes so a
    // pipeline upgrade transparently invalidates the cache. See PARSER_VERSION.
    parserVersion: text("parser_version"),
    userComment: text("user_comment"),
    telegramChatId: text("telegram_chat_id"),
    status: text("status")
      .$type<ParseJobStatus>()
      .notNull()
      .default(PARSE_JOB_STATUS.PENDING),
    result: jsonb("result"),
    error: text("error"),
    pushEndpoint: text("push_endpoint"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [index("parse_jobs_normalized_url_idx").on(table.normalizedUrl)],
);

export const parseJobsRelations = relations(parseJobs, ({ one }) => ({
  user: one(user, {
    fields: [parseJobs.userId],
    references: [user.id],
  }),
}));
