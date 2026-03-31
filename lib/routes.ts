export const routes = {
  recipes: {
    list: (locale: string) => `/${locale}/recipes`,
    detail: (locale: string, id: string) => `/${locale}/recipes/${id}`,
    new: (locale: string) => `/${locale}/recipes/new`,
    edit: (locale: string, id: string) => `/${locale}/recipes/${id}/edit`,
    parse: (locale: string) => `/${locale}/recipes/parse`,
  },

  profile: (locale: string) => `/${locale}/profile`,
  login: (locale: string) => `/${locale}/login`,
} as const;

export const api = {
  parseRecipe: "/api/parse-recipe",
  recipesSync: "/api/recipes/sync",
  recipes: "/api/recipes",
  recipe: (id: string) => `/api/recipes/${id}`,
  images: {
    upload: "/api/images/upload",
    delete: "/api/images/delete",
  },
  parseQueue: "/api/parse-queue",
  parseQueueJob: (id: string) => `/api/parse-queue/${id}`,
  parseQueueProcess: "/api/parse-queue/process",
} as const;
