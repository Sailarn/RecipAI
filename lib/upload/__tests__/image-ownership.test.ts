import { describe, expect, it } from "vitest";
import {
  ownershipFromTags,
  ownerTagFor,
  PARSE_CACHE_OWNER_TAG,
} from "../image-ownership";

describe("ownerTagFor", () => {
  it("tags a signed-in upload with the user id", () => {
    expect(ownerTagFor({ userId: "u1" })).toBe("owner-user-u1");
  });

  it("tags a token upload with a hash, never the token itself", () => {
    const tag = ownerTagFor({ uploadToken: "secret-token" });

    expect(tag).toMatch(/^owner-token-[0-9a-f]{32}$/);
    expect(tag).not.toContain("secret-token");
  });

  it("gives the same token the same tag", () => {
    expect(ownerTagFor({ uploadToken: "t" })).toBe(
      ownerTagFor({ uploadToken: "t" }),
    );
  });

  it("tags an upload without credentials as anonymous", () => {
    expect(ownerTagFor(null)).toBe("owner-anonymous");
  });
});

describe("ownershipFromTags", () => {
  it("is owned when the owner tag matches the caller", () => {
    expect(ownershipFromTags(["x", "owner-user-u1"], { userId: "u1" })).toBe(
      "owned",
    );
  });

  it("matches a token caller by its hashed tag", () => {
    const tags = [ownerTagFor({ uploadToken: "t" })];

    expect(ownershipFromTags(tags, { uploadToken: "t" })).toBe("owned");
    expect(ownershipFromTags(tags, { uploadToken: "other" })).toBe("not-owned");
  });

  it("is not owned for another user's file", () => {
    expect(ownershipFromTags(["owner-user-u2"], { userId: "u1" })).toBe(
      "not-owned",
    );
  });

  it("is never owned for a parse-cache file", () => {
    expect(ownershipFromTags([PARSE_CACHE_OWNER_TAG], { userId: "u1" })).toBe(
      "not-owned",
    );
  });

  it("is untagged when no owner tag is present", () => {
    expect(ownershipFromTags(["holiday"], { userId: "u1" })).toBe("untagged");
    expect(ownershipFromTags([], { userId: "u1" })).toBe("untagged");
  });
});
