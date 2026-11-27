import { redirect } from "next/navigation";
import { auth } from "./config";

/** For server components: the signed-in user, or a redirect to /signin. */
export async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) redirect("/signin");
  return session.user;
}
