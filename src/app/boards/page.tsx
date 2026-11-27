import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ORG_COOKIE } from "@/lib/org-cookie";
import { requireUser } from "@/server/auth/session";
import { connectDb } from "@/server/db/connect";
import { ensureWorkspace } from "@/server/db/workspace";

/**
 * Home after sign-in. Makes sure the user has a workspace (moving any boards from before
 * organizations existed into it), then opens the organization they used last.
 */
export default async function Home() {
  const user = await requireUser();
  await connectDb();
  const orgs = await ensureWorkspace(user.id);
  const last = (await cookies()).get(ORG_COOKIE)?.value;
  const org = orgs.find((o) => o._id.toString() === last) ?? orgs[0];
  redirect(`/w/${org._id.toString()}`);
}
