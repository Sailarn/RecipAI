import { mcp } from "better-auth/plugins";
import { getTableColumns, getTableName } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { oauthAccessToken, oauthApplication, oauthConsent } from "../auth";

const tables = { oauthApplication, oauthAccessToken, oauthConsent };

// The Drizzle adapter resolves plugin models by export name and fields by
// column property name, so a missing or misspelled column only fails at
// runtime (on the first client registration or token exchange). Pin the
// tables to the plugin's own schema instead.
describe("oauth provider schema", () => {
  const pluginSchema = mcp({ loginPage: "/login" }).schema;

  it.each(Object.entries(pluginSchema))(
    "%s has a column for every field the mcp plugin writes",
    (modelName, model) => {
      const table = tables[modelName as keyof typeof tables];
      expect(table, `missing table export ${modelName}`).toBeDefined();

      const columns = Object.keys(getTableColumns(table));
      expect(columns).toEqual(
        expect.arrayContaining(["id", ...Object.keys(model.fields)]),
      );
    },
  );

  it("uses snake_case table names", () => {
    expect(getTableName(oauthApplication)).toBe("oauth_application");
    expect(getTableName(oauthAccessToken)).toBe("oauth_access_token");
    expect(getTableName(oauthConsent)).toBe("oauth_consent");
  });
});
