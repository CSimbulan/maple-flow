import type { Metadata } from "next";
import { AppShell } from "@/client/components/AppShell";
import { HomePage } from "@/client/components/HomePage";
import { requireUser } from "@/server/auth/session";
import { connectDb } from "@/server/db/connect";
import { ensureWorkspace } from "@/server/db/workspace";

export const metadata: Metadata = { title: "Home · Maple Flow" };

/** The signed-in user's home page: their workspaces, recent boards and assigned cards. */
export default async function Home() {
  const user = await requireUser();
  // Someone can open /home directly; they still need a workspace (returns early if they have one).
  await connectDb();
  await ensureWorkspace(user.id);
  return (
    <AppShell user={user}>
      <HomePage />
    </AppShell>
  );
}
