import { AppShell } from "@/client/components/AppShell";
import { OrgOverview } from "@/client/components/OrgPages";
import { requireUser } from "@/server/auth/session";

export default async function OrgPage({ params }: { params: Promise<{ orgId: string }> }) {
  const user = await requireUser();
  const { orgId } = await params;
  return (
    <AppShell user={user} orgId={orgId}>
      <OrgOverview orgId={orgId} />
    </AppShell>
  );
}
