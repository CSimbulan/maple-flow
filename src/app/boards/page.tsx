import type { Metadata } from "next";
import { AppShell } from "@/client/components/AppShell";
import { BoardsGrid } from "@/client/components/BoardsGrid";
import { requireUser } from "@/server/auth/session";

export const metadata: Metadata = { title: "Boards · Maple Flow" };

export default async function BoardsPage() {
  const user = await requireUser();
  return (
    <AppShell user={user}>
      <BoardsGrid />
    </AppShell>
  );
}
