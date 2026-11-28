import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ORG_COOKIE } from "@/lib/org-cookie";
import { connectDb } from "./db/connect";
import { startPath } from "./db/workspace";

/** Redirect a signed-in user to their start page (home, or the workspace they used last). */
export async function goToStartPage(userId: string): Promise<never> {
  await connectDb();
  const lastOrgId = (await cookies()).get(ORG_COOKIE)?.value;
  redirect(await startPath(userId, lastOrgId));
}
