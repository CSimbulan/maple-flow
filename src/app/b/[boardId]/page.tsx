import { AppShell } from "@/client/components/AppShell";
import { BoardView } from "@/client/components/BoardView";
import { requireUser } from "@/server/auth/session";

export default async function BoardPage({ params }: { params: Promise<{ boardId: string }> }) {
  const user = await requireUser();
  const { boardId } = await params;
  return (
    // Boards need the full width, so the sidebar slides in from the menu button instead.
    <AppShell user={user} sidebar="drawer">
      <BoardView boardId={boardId} />
    </AppShell>
  );
}
