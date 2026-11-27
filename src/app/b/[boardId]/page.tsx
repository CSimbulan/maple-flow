import { AppShell } from "@/client/components/AppShell";
import { BoardView } from "@/client/components/BoardView";
import { requireUser } from "@/server/auth/session";

export default async function BoardPage({ params }: { params: Promise<{ boardId: string }> }) {
  const user = await requireUser();
  const { boardId } = await params;
  return (
    // Same docked sidebar as the project page; the lists scroll sideways in the remaining width.
    <AppShell user={user}>
      <BoardView boardId={boardId} />
    </AppShell>
  );
}
