/**
 * Create (or refresh) the AI-connector directory reviewers' account: an email
 * and password login with sample recipes and collections, so Anthropic's
 * reviewers have a "fully populated account" to test every tool with.
 *
 *   DATABASE_URL=… REVIEW_ACCOUNT_PASSWORD=… bun run scripts/seed-review-account.ts
 *
 * Idempotent: re-running updates the password and adds anything missing, and
 * never touches other users. The password is never stored in the repository.
 * See docs/specs/claude-directory-listing.md.
 */
import { hashPassword } from "better-auth/crypto";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { account, user } from "@/db/schema/auth";
import { collections } from "@/db/schema/collections";
import { recipes } from "@/db/schema/recipes";
import { buildShape } from "@/lib/recipes/mutations";

export const REVIEW_ACCOUNT_EMAIL = "denis9524+recipai-review@gmail.com";
const REVIEW_USER_ID = "review-account";

const COLLECTIONS = [
  { id: "review-collection-weeknight", name: "Weeknight dinners", emoji: "🍲" },
  { id: "review-collection-baking", name: "Baking", emoji: "🧁" },
];

type Sample = {
  id: string;
  title: string;
  description: string;
  category: string;
  servings: number;
  prepTime: number;
  cookTime: number;
  collectionIds: string[];
  ingredients: Array<{
    item: string;
    amount?: number;
    unit?: string;
    section?: string;
  }>;
  steps: Array<{ instruction: string; section?: string }>;
};

const SAMPLES: Sample[] = [
  {
    id: "review-recipe-borscht",
    title: "Ukrainian borscht",
    description: "Classic red beet soup with beef and cabbage.",
    category: "Soup",
    servings: 6,
    prepTime: 30,
    cookTime: 120,
    collectionIds: ["review-collection-weeknight"],
    ingredients: [
      { item: "beef brisket", amount: 500, unit: "g", section: "Broth" },
      { item: "water", amount: 3, unit: "l", section: "Broth" },
      { item: "beets", amount: 3, unit: "pcs", section: "Vegetables" },
      { item: "potatoes", amount: 3, unit: "pcs", section: "Vegetables" },
      { item: "white cabbage", amount: 300, unit: "g", section: "Vegetables" },
      { item: "carrot", amount: 1, unit: "pcs", section: "Vegetables" },
      { item: "onion", amount: 1, unit: "pcs", section: "Vegetables" },
      { item: "tomato paste", amount: 2, unit: "tbsp", section: "Vegetables" },
      { item: "garlic", amount: 3, unit: "cloves" },
      { item: "sour cream", amount: 100, unit: "g" },
    ],
    steps: [
      {
        instruction:
          "Simmer the beef in the water for 1.5 hours, skimming the foam.",
        section: "Broth",
      },
      {
        instruction:
          "Grate the beets and carrot, chop the onion, and sauté them with the tomato paste for 10 minutes.",
        section: "Vegetables",
      },
      {
        instruction:
          "Add diced potatoes and shredded cabbage to the broth and cook for 15 minutes.",
        section: "Vegetables",
      },
      {
        instruction:
          "Stir in the sautéed vegetables and crushed garlic, simmer 10 minutes more, then rest 20 minutes.",
      },
      { instruction: "Serve with sour cream." },
    ],
  },
  {
    id: "review-recipe-pancakes",
    title: "Thin pancakes",
    description: "Crêpe-style pancakes for sweet or savoury fillings.",
    category: "Breakfast",
    servings: 4,
    prepTime: 15,
    cookTime: 20,
    collectionIds: [],
    ingredients: [
      { item: "plain flour", amount: 200, unit: "g" },
      { item: "eggs", amount: 2, unit: "pcs" },
      { item: "milk", amount: 300, unit: "ml" },
      { item: "sugar", amount: 1, unit: "tbsp" },
      { item: "salt", amount: 1, unit: "pinch" },
      { item: "butter", amount: 20, unit: "g" },
    ],
    steps: [
      {
        instruction:
          "Whisk the flour, eggs, milk, sugar and salt into a smooth batter.",
      },
      { instruction: "Rest the batter for 10 minutes." },
      {
        instruction:
          "Fry thin pancakes in a hot buttered pan, about 1 minute per side.",
      },
    ],
  },
  {
    id: "review-recipe-chicken-curry",
    title: "Quick chicken curry",
    description: "A 30-minute curry with coconut milk.",
    category: "Dinner",
    servings: 4,
    prepTime: 10,
    cookTime: 20,
    collectionIds: ["review-collection-weeknight"],
    ingredients: [
      { item: "chicken thighs", amount: 600, unit: "g" },
      { item: "onion", amount: 1, unit: "pcs" },
      { item: "curry paste", amount: 3, unit: "tbsp" },
      { item: "coconut milk", amount: 400, unit: "ml" },
      { item: "spinach", amount: 100, unit: "g" },
      { item: "rice", amount: 300, unit: "g" },
    ],
    steps: [
      { instruction: "Cook the rice according to the packet." },
      {
        instruction:
          "Fry the sliced onion until soft, add the curry paste and cook for 1 minute.",
      },
      {
        instruction:
          "Add the chicken, brown it, then pour in the coconut milk and simmer for 15 minutes.",
      },
      {
        instruction:
          "Stir in the spinach until wilted and serve over the rice.",
      },
    ],
  },
  {
    id: "review-recipe-greek-salad",
    title: "Greek salad",
    description: "Tomatoes, cucumber, olives and feta.",
    category: "Salad",
    servings: 2,
    prepTime: 10,
    cookTime: 0,
    collectionIds: [],
    ingredients: [
      { item: "tomatoes", amount: 3, unit: "pcs" },
      { item: "cucumber", amount: 1, unit: "pcs" },
      { item: "red onion", amount: 0.5, unit: "pcs" },
      { item: "kalamata olives", amount: 80, unit: "g" },
      { item: "feta", amount: 150, unit: "g" },
      { item: "olive oil", amount: 3, unit: "tbsp" },
      { item: "dried oregano", amount: 1, unit: "tsp" },
    ],
    steps: [
      {
        instruction:
          "Cut the tomatoes and cucumber into chunks and slice the onion.",
      },
      {
        instruction:
          "Add the olives, top with the feta, drizzle with olive oil and sprinkle with oregano.",
      },
    ],
  },
  {
    id: "review-recipe-banana-bread",
    title: "Banana bread",
    description: "Moist loaf with very ripe bananas.",
    category: "Baking",
    servings: 8,
    prepTime: 15,
    cookTime: 60,
    collectionIds: ["review-collection-baking"],
    ingredients: [
      { item: "ripe bananas", amount: 3, unit: "pcs" },
      { item: "melted butter", amount: 80, unit: "g" },
      { item: "sugar", amount: 120, unit: "g" },
      { item: "egg", amount: 1, unit: "pcs" },
      { item: "plain flour", amount: 200, unit: "g" },
      { item: "baking soda", amount: 1, unit: "tsp" },
      { item: "salt", amount: 1, unit: "pinch" },
    ],
    steps: [
      { instruction: "Heat the oven to 175°C and line a loaf tin." },
      { instruction: "Mash the bananas and mix in the butter, sugar and egg." },
      { instruction: "Fold in the flour, baking soda and salt." },
      {
        instruction: "Bake for 55–60 minutes, until a skewer comes out clean.",
      },
    ],
  },
  {
    id: "review-recipe-syrniki",
    title: "Syrniki (cottage cheese pancakes)",
    description: "Ukrainian cottage cheese pancakes.",
    category: "Breakfast",
    servings: 3,
    prepTime: 10,
    cookTime: 15,
    collectionIds: ["review-collection-baking"],
    ingredients: [
      { item: "cottage cheese", amount: 400, unit: "g", section: "Dough" },
      { item: "egg", amount: 1, unit: "pcs", section: "Dough" },
      { item: "sugar", amount: 2, unit: "tbsp", section: "Dough" },
      { item: "plain flour", amount: 4, unit: "tbsp", section: "Dough" },
      { item: "sour cream", amount: 100, unit: "g", section: "To serve" },
      { item: "berry jam", amount: 3, unit: "tbsp", section: "To serve" },
    ],
    steps: [
      {
        instruction:
          "Mix the cottage cheese, egg, sugar and flour into a soft dough.",
        section: "Dough",
      },
      {
        instruction: "Shape small patties and dust them with flour.",
        section: "Dough",
      },
      {
        instruction:
          "Fry on medium heat for 3–4 minutes per side until golden.",
      },
      { instruction: "Serve with sour cream and jam.", section: "To serve" },
    ],
  },
];

async function main(): Promise<void> {
  const password = process.env.REVIEW_ACCOUNT_PASSWORD;
  if (!password || password.length < 12) {
    throw new Error("Set REVIEW_ACCOUNT_PASSWORD (at least 12 characters).");
  }
  const now = new Date();
  const passwordHash = await hashPassword(password);

  const [existing] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, REVIEW_ACCOUNT_EMAIL))
    .limit(1);
  const userId = existing?.id ?? REVIEW_USER_ID;
  if (!existing) {
    await db.insert(user).values({
      id: userId,
      name: "RecipAI Reviewer",
      email: REVIEW_ACCOUNT_EMAIL,
      emailVerified: true,
      createdAt: now,
      updatedAt: now,
    });
  }

  const [credential] = await db
    .select({ id: account.id })
    .from(account)
    .where(
      and(eq(account.userId, userId), eq(account.providerId, "credential")),
    )
    .limit(1);
  if (credential) {
    await db
      .update(account)
      .set({ password: passwordHash, updatedAt: now })
      .where(eq(account.id, credential.id));
  } else {
    await db.insert(account).values({
      id: `${userId}-credential`,
      accountId: userId,
      providerId: "credential",
      userId,
      password: passwordHash,
      createdAt: now,
      updatedAt: now,
    });
  }

  await db
    .insert(collections)
    .values(
      COLLECTIONS.map((collection) => ({
        ...collection,
        userId,
        createdAt: now,
        updatedAt: now,
      })),
    )
    .onConflictDoNothing();

  for (const sample of SAMPLES) {
    const shape = buildShape(sample.ingredients, sample.steps);
    await db
      .insert(recipes)
      .values({
        id: sample.id,
        userId,
        title: sample.title,
        description: sample.description,
        category: sample.category,
        servings: sample.servings,
        prepTime: sample.prepTime,
        cookTime: sample.cookTime,
        totalTime: sample.prepTime + sample.cookTime,
        ingredients: shape.ingredients,
        instructions: shape.instructions,
        sections: shape.sections,
        collectionIds: sample.collectionIds,
        isPublic: false,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing();
  }

  console.log(
    `Review account ready: ${REVIEW_ACCOUNT_EMAIL} (${SAMPLES.length} recipes, ${COLLECTIONS.length} collections).`,
  );
}

if (import.meta.main) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { COLLECTIONS, main, SAMPLES };
