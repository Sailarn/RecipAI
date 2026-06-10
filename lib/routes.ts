export const routes = {
  recipes: {
    list: (locale: string) => `/${locale}/recipes`,
    detail: (locale: string, id: string) => `/${locale}/recipes/${id}`,
    new: (locale: string) => `/${locale}/recipes/new`,
    edit: (locale: string, id: string) => `/${locale}/recipes/${id}/edit`,
    parse: (locale: string) => `/${locale}/recipes/parse`,
  },

  pantry: (locale: string) => `/${locale}/pantry`,
  profile: (locale: string) => `/${locale}/profile`,
  login: (locale: string) => `/${locale}/login`,
  syncReview: (locale: string) => `/${locale}/sync-review`,
  parseHistory: (locale: string) => `/${locale}/parse-history`,
} as const;

export const api = {
  recipesSync: "/api/recipes/sync",
  recipes: "/api/recipes",
  recipe: (id: string) => `/api/recipes/${id}`,
  images: {
    upload: "/api/images/upload",
    delete: "/api/images/delete",
  },
  parseRecipePhoto: "/api/parse-recipe/photo",
  parseQueue: "/api/parse-queue",
  parseQueueJob: (id: string) => `/api/parse-queue/${id}`,
  parseQueueProcess: "/api/parse-queue/process",
  parseQueueClaim: "/api/parse-queue/claim",
  telegramBot: "/api/telegram-bot",
  collections: "/api/collections",
  collection: (id: string) => `/api/collections/${id}`,
  collectionsSync: "/api/collections/sync",
  ingredients: "/api/ingredients",
  ingredientsEnrich: "/api/ingredients/enrich",
  pantry: "/api/pantry",
  pushSubscribe: "/api/push/subscribe",
} as const;
