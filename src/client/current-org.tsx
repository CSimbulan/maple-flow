"use client";

import { createContext, useContext, useEffect } from "react";
import { ORG_COOKIE } from "@/lib/org-cookie";

type CurrentOrg = { orgId: string | null; setOrgId: (id: string | null) => void };

export const CurrentOrgContext = createContext<CurrentOrg>({ orgId: null, setOrgId: () => {} });

/** The organization the app frame is showing (switcher, sidebar). */
export const useCurrentOrg = () => useContext(CurrentOrgContext);

/** For pages that learn their organization after loading, such as a board. */
export function useShowOrg(orgId: string | null | undefined) {
  const { setOrgId } = useCurrentOrg();
  useEffect(() => {
    if (orgId) setOrgId(orgId);
  }, [orgId, setOrgId]);
}

export function rememberOrg(orgId: string) {
  document.cookie = `${ORG_COOKIE}=${orgId}; path=/; max-age=31536000; samesite=lax`;
}
