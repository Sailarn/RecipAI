import { describe, expect, it } from "vitest";
import { shouldReportAuthError } from "../auth-error-report";

describe("shouldReportAuthError", () => {
  it("reports a raw throw with no status (e.g. a DB insert failure)", () => {
    expect(shouldReportAuthError(new Error("null value in column email"))).toBe(
      true,
    );
  });

  it("reports an internal server error", () => {
    expect(shouldReportAuthError({ status: "INTERNAL_SERVER_ERROR" })).toBe(
      true,
    );
  });

  it("skips routine unauthorized errors", () => {
    expect(shouldReportAuthError({ status: "UNAUTHORIZED" })).toBe(false);
  });

  it("skips bad request and rate-limit errors", () => {
    expect(shouldReportAuthError({ status: "BAD_REQUEST" })).toBe(false);
    expect(shouldReportAuthError({ status: "TOO_MANY_REQUESTS" })).toBe(false);
  });

  it("reports when the error is null or undefined (unexpected)", () => {
    expect(shouldReportAuthError(null)).toBe(true);
    expect(shouldReportAuthError(undefined)).toBe(true);
  });

  it("reports an unknown status string", () => {
    expect(shouldReportAuthError({ status: "SOME_NEW_STATUS" })).toBe(true);
  });
});
