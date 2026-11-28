import { requireUser } from "@/server/auth/session";
import { goToStartPage } from "@/server/start";

/** Old entry point, kept so earlier links and bookmarks still work: same as the site root. */
export default async function Boards() {
  const user = await requireUser();
  await goToStartPage(user.id);
}
