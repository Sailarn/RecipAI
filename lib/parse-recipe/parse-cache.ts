import { and, desc, eq, isNotNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { parseJobs } from "@/db/schema/parse-jobs";
import { PARSE_JOB_STATUS, type ParsedRecipe } from "@/lib/db/schema";
import { PARSER_VERSION } from "./parser-version";

/**
 * Result cache: the newest complete result for this normalized URL produced by
 * the current pipeline version, so a repeat import can skip the AI parse. A
 * complete recipe needs both ingredients and instructions.
 */
export async function findCachedParseResult(
  normalizedUrl: string,
): Promise<ParsedRecipe | null> {
  const [cached] = await db
    .select({ result: parseJobs.result })
    .from(parseJobs)
    .where(
      and(
        eq(parseJobs.normalizedUrl, normalizedUrl),
        eq(parseJobs.status, PARSE_JOB_STATUS.DONE),
        eq(parseJobs.parserVersion, PARSER_VERSION),
        isNotNull(parseJobs.result),
        sql`(
          jsonb_array_length(coalesce(${parseJobs.result} -> 'ingredients', '[]'::jsonb)) > 0
          AND jsonb_array_length(coalesce(${parseJobs.result} -> 'instructions', '[]'::jsonb)) > 0
        )`,
      ),
    )
    .orderBy(desc(parseJobs.createdAt))
    .limit(1);
  return cached?.result ?? null;
}
