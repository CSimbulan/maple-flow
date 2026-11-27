import type { Metadata } from "next";
import { AppShell } from "@/client/components/AppShell";
import { OrgSettings } from "@/client/components/OrgSettings";
import { requireUser } from "@/server/auth/session";

export const metadata: Metadata = { title: "Workspace settings · Maple Flow" };

export default async function Settings({ params }: { params: Promise<{ orgId: string }> }) {
  const user = await requireUser();
  const { orgId } = await params;
  return (
    <AppShell user={user} orgId={orgId}>
      <OrgSettings orgId={orgId} />
    </AppShell>
  );
}
