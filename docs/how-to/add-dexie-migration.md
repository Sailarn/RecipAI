# Add a Dexie Migration

Dexie uses versioned migrations. Any schema change — new table, new index, dropped table — requires a new version.

## 1. Add the new version in `lib/db/db.ts`

Always add after the existing versions. Never modify a past version:

```ts
// v12: add bookmarks table
this.version(12).stores({
  recipes: "id, title, createdAt, updatedAt, status",
  parsedRecipes: "id, createdAt",
  collections: "id, name, createdAt",
  notifications: "id, entityId, entityType, type, createdAt",
  ingredients: "id, category",
  pantry: "id, ingredientId",
  parseHistory: "id, createdAt, status",
  bookmarks: "id, createdAt",           // new table
});
```

!!! note "Repeat all stores by convention"
    Dexie accumulates schema across versions — a table you don't mention is inherited from earlier versions, not deleted (to drop one you set it to `null`, see step 4). This project still repeats the full schema in every version for clarity, so follow that pattern for consistency with `lib/db/db.ts`.

## 2. Add the TypeScript type to `lib/db/schema.ts`

```ts
export interface Bookmark {
  id: string;
  recipeId: string;
  createdAt: Date;
}
```

## 3. Add the table property to the class

```ts
class RecipeDatabase extends Dexie {
  // ...existing tables
  bookmarks!: EntityTable<Bookmark, "id">;
}
```

## 4. Dropping a table requires two versions

IndexedDB does not support changing a store's keyPath in place. To drop and recreate (or just drop):

```ts
// v12: drop bookmarks
this.version(12).stores({
  // ...all other tables
  bookmarks: null,   // null = drop
});

// v13: recreate with new key
this.version(13).stores({
  // ...all other tables
  bookmarks: "id, recipeId, createdAt",
});
```

## 5. Add CRUD helpers in `lib/db/`

Create `lib/db/bookmarks.ts` with typed read/write functions. Import `db` from `./db` and the type from `./schema`.

## 6. Update `docs/reference/data-model.md`

Add the new table to the Tables section and the migration to the history table.
