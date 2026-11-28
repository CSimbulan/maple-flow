// Where someone lands after signing in (or opening the site root). Stored on the user; there's
// no settings control yet, but setStartPage in the API can change it.

/** HOME: their home page. LAST_WORKSPACE: the workspace they used last. */
export const START_PAGES = ["HOME", "LAST_WORKSPACE"] as const;

export type StartPage = (typeof START_PAGES)[number];

/** For users who never chose one. */
export const DEFAULT_START_PAGE: StartPage = "HOME";

export const HOME_PATH = "/home";
