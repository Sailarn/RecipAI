import { routes } from "@/lib/routes";

export interface BottomNavState {
  /** Routes where the nav is hidden entirely (edit, login, recipe detail). */
  shouldHide: boolean;
  /** The pantry route, which swaps both pills into pantry layout. */
  isPantryMode: boolean;
  /** The nav target whose item should render active. */
  activeHref: string;
}

const EDIT_SUFFIX = "/edit";

/**
 * Derive the bottom-nav display state from the current path, comparing against
 * `routes.*` rather than hardcoded path fragments. Recipe detail pages
 * (`/recipes/<id>`) hide the nav, but the parse page (`/recipes/parse`) does not.
 */
export function getBottomNavState(
  pathname: string,
  locale: string,
): BottomNavState {
  const recipesHref = routes.recipes.list(locale);
  const parseHref = routes.recipes.parse(locale);
  const profileHref = routes.profile(locale);
  const pantryHref = routes.pantry(locale);
  const loginHref = routes.login(locale);

  const isPantryMode = pathname.startsWith(pantryHref);

  const isRecipeDetail =
    /\/recipes\/[^/]+$/.test(pathname) && !pathname.startsWith(parseHref);
  const shouldHide =
    pathname.endsWith(EDIT_SUFFIX) ||
    pathname.startsWith(loginHref) ||
    isRecipeDetail;

  const activeHref = pathname.startsWith(parseHref)
    ? parseHref
    : pathname.startsWith(profileHref)
      ? profileHref
      : recipesHref;

  return { shouldHide, isPantryMode, activeHref };
}
