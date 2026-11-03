import { mcp } from "better-auth/plugins";
import { getTableColumns, getTableName } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import * as authSchema from "../auth";

// The Drizzle adapter resolves plugin models by export name and fields by
// column property name, so a missing or misspelled column only fails at
// runtime (on the first client registration or token exchange). Pin the
// tables to the plugin's own schema instead.
describe("oauth provider schema", () => {
  const pluginSchema = mcp({ loginPage: "/login" }).schema;

  it.each(Object.entries(pluginSchema))(
    "%s has a column for every field the mcp plugin writes",
    (modelName, model) => {
      const table = authSchema[modelName as keyof typeof authSchema];
      expect(table, `missing table export ${modelName}`).toBeDefined();

      const columns = Object.keys(
        getTableColumns(table as typeof authSchema.oauthApplication),
      );
      expect(columns).toEqual(
        expect.arrayContaining(["id", ...Object.keys(model.fields)]),
      );
    },
  );

  it("uses snake_case table names", () => {
    expect(getTableName(authSchema.oauthApplication)).toBe("oauth_application");
    expect(getTableName(authSchema.oauthAccessToken)).toBe(
      "oauth_access_token",
    );
    expect(getTableName(authSchema.oauthConsent)).toBe("oauth_consent");
  });
});
