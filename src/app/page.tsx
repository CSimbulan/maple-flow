import { redirect } from "next/navigation";
import { goToStartPage } from "@/server/start";
import { auth } from "@/server/auth/config";

/** The site root: signed-in people go to their start page (see startPath), others sign in. */
export default async function Root() {
  const session = await auth();
  if (!session?.user?.id) redirect("/signin");
  await goToStartPage(session.user.id);
}
