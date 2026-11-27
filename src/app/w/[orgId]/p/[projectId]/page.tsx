import { AppShell } from "@/client/components/AppShell";
import { ProjectPage } from "@/client/components/OrgPages";
import { requireUser } from "@/server/auth/session";

export default async function Project({
  params,
}: {
  params: Promise<{ orgId: string; projectId: string }>;
}) {
  const user = await requireUser();
  const { orgId, projectId } = await params;
  return (
    <AppShell user={user} orgId={orgId}>
      <ProjectPage projectId={projectId} />
    </AppShell>
  );
}
