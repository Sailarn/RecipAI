import { describe, expect, it } from "vitest";
import { PARSE_JOB_STATUS } from "@/lib/db/schema";
import { isStaleParseJob } from "../stale-parse-jobs";

const NOW = Date.parse("2026-10-28T12:00:00Z");
const minutesAgo = (minutes: number) => new Date(NOW - minutes * 60_000);

describe("isStaleParseJob", () => {
  it.each([PARSE_JOB_STATUS.PENDING, PARSE_JOB_STATUS.PROCESSING])(
    "is stale when %s for ten minutes or more",
    (status) => {
      expect(isStaleParseJob({ status, updatedAt: minutesAgo(10) }, NOW)).toBe(
        true,
      );
    },
  );

  it("is not stale while still within ten minutes", () => {
    expect(
      isStaleParseJob(
        { status: PARSE_JOB_STATUS.PROCESSING, updatedAt: minutesAgo(9) },
        NOW,
      ),
    ).toBe(false);
  });

  it.each([PARSE_JOB_STATUS.DONE, PARSE_JOB_STATUS.FAILED])(
    "is never stale once %s",
    (status) => {
      expect(isStaleParseJob({ status, updatedAt: minutesAgo(600) }, NOW)).toBe(
        false,
      );
    },
  );
});
