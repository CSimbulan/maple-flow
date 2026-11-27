/**
 * Cookie holding the organization opened last. The browser sets it (current-org.tsx) and the
 * server reads it to pick where /boards goes. Kept outside "use client" modules so both can import it.
 */
export const ORG_COOKIE = "mf-org";
