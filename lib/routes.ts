export const routes = {
  home: (locale: string) => `/${locale}`,

  recipes: {
    list: (locale: string) => `/${locale}/recipes`,
    detail: (locale: string, id: string) => `/${locale}/recipes/${id}`,
    new: (locale: string) => `/${locale}/recipes/new`,
    edit: (locale: string, id: string) => `/${locale}/recipes/${id}/edit`,
    parse: (locale: string) => `/${locale}/recipes/parse`,
  },

  profile: (locale: string) => `/${locale}/profile`,
} as const;

export const api = {
  parseRecipe: "/api/parse-recipe",
  images: {
    upload: "/api/images/upload",
    delete: "/api/images/delete",
  },
} as const;
