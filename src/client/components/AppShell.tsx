import type { ReactNode } from "react";
import { signOut } from "@/server/auth/config";
import { AppFrame } from "./AppFrame";

type ShellUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
};

async function signOutAction() {
  "use server";
  await signOut({ redirectTo: "/signin" });
}

/** Signed-in page frame: top bar, projects sidebar and main area. Server component. */
export function AppShell({
  user,
  orgId,
  sidebar,
  children,
}: {
  user: ShellUser;
  orgId?: string;
  sidebar?: "docked" | "drawer";
  children: ReactNode;
}) {
  return (
    <AppFrame
      user={{
        id: user.id,
        name: user.name ?? null,
        email: user.email ?? null,
        image: user.image ?? null,
      }}
      signOutAction={signOutAction}
      orgId={orgId}
      sidebar={sidebar}
    >
      {children}
    </AppFrame>
  );
}
