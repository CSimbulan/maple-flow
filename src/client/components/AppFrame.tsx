"use client";

import { ApolloProvider } from "@apollo/client/react";
import MenuIcon from "@mui/icons-material/Menu";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import ListItemText from "@mui/material/ListItemText";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { BRAND, BRAND_GRADIENT } from "@/brand";
import { HOME_PATH } from "@/lib/start-page";
import { getApolloClient } from "../apollo/client";
import { CurrentOrgContext, rememberOrg } from "../current-org";
import { OrgSwitcher } from "./OrgSwitcher";
import { Sidebar } from "./Sidebar";
import { MapleLogo } from "./MapleLogo";
import { UserAvatar } from "./UserAvatar";

export type FrameUser = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
};

const SIDEBAR_WIDTH = 248;

/** Avatar size on the colored bars (top bar and board header). */
export const BAR_AVATAR_SIZE = 30;

/**
 * Top bar (menu button, app name, organization switcher, account menu) and the projects sidebar.
 * `sidebar="docked"` keeps the sidebar open beside the page from the `md` breakpoint up; "drawer"
 * always slides it in from the menu button (for pages that need the full width).
 */
export function AppFrame({
  user,
  signOutAction,
  orgId: initialOrgId,
  sidebar = "docked",
  children,
}: {
  user: FrameUser;
  signOutAction: () => Promise<void>;
  orgId?: string;
  sidebar?: "docked" | "drawer";
  children: ReactNode;
}) {
  // The URL's organization wins; pages without one in the URL (boards) report theirs instead.
  // The home page spans every workspace, so it has none.
  const [reportedOrgId, setOrgId] = useState<string | null>(null);
  const onHome = usePathname() === HOME_PATH;
  const orgId = onHome ? null : (initialOrgId ?? reportedOrgId);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [accountAnchor, setAccountAnchor] = useState<HTMLElement | null>(null);
  const current = useMemo(() => ({ orgId, setOrgId }), [orgId]);
  // One Apollo cache per signed-in user, so nobody sees what the previous user loaded.
  const apollo = useMemo(() => getApolloClient(user.id), [user.id]);

  useEffect(() => {
    if (orgId) rememberOrg(orgId);
  }, [orgId]);

  const docked = sidebar === "docked";

  return (
    <ApolloProvider client={apollo}>
      <CurrentOrgContext.Provider value={current}>
        <Box sx={{ height: "100dvh", display: "flex", flexDirection: "column" }}>
          <AppBar
            position="static"
            elevation={0}
            sx={{ background: BRAND_GRADIENT, color: "#fff" }}
          >
            <Toolbar variant="dense" sx={{ gap: { xs: 1, sm: 2 }, px: { xs: 1, sm: 2 } }}>
              <IconButton
                color="inherit"
                edge="start"
                aria-label="Open navigation"
                onClick={() => setDrawerOpen(true)}
                sx={{ display: docked ? { md: "none" } : undefined }}
              >
                <MenuIcon />
              </IconButton>
              {/* Logo and name go home together; phones show only the logo. */}
              <Box
                component={Link}
                href={HOME_PATH}
                aria-label="Maple Flow"
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  color: "inherit",
                  textDecoration: "none",
                  flexShrink: 0,
                }}
              >
                <MapleLogo aria-hidden sx={{ fontSize: 28 }} />
                <Typography
                  component="span"
                  variant="h6"
                  sx={{
                    fontWeight: 700,
                    whiteSpace: "nowrap",
                    display: { xs: "none", sm: "block" },
                  }}
                >
                  Maple Flow
                </Typography>
              </Box>
              <OrgSwitcher />
              <Box sx={{ flexGrow: 1 }} />
              <IconButton
                aria-label="Account"
                onClick={(e) => setAccountAnchor(e.currentTarget)}
                sx={{ p: 0.5 }}
              >
                <UserAvatar
                  user={{ name: user.name, email: user.email ?? "?", image: user.image }}
                  size={BAR_AVATAR_SIZE}
                  onBar
                />
              </IconButton>
              <Menu
                anchorEl={accountAnchor}
                open={!!accountAnchor}
                onClose={() => setAccountAnchor(null)}
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                transformOrigin={{ vertical: "top", horizontal: "right" }}
              >
                <Box sx={{ px: 2, py: 1 }}>
                  <ListItemText primary={user.name ?? "Signed in"} secondary={user.email} />
                </Box>
                <Divider />
                <form action={signOutAction}>
                  <MenuItem component="button" type="submit" sx={{ width: "100%" }}>
                    Sign Out
                  </MenuItem>
                </form>
              </Menu>
            </Toolbar>
          </AppBar>

          <Box sx={{ display: "flex", flexGrow: 1, minHeight: 0 }}>
            {docked && (
              <Box
                sx={{
                  display: { xs: "none", md: "block" },
                  width: SIDEBAR_WIDTH,
                  flexShrink: 0,
                  borderRight: 1,
                  borderColor: "divider",
                  bgcolor: BRAND.warmWhite,
                }}
              >
                <Sidebar />
              </Box>
            )}
            <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)}>
              <Box sx={{ width: SIDEBAR_WIDTH, height: "100%" }}>
                <Sidebar onNavigate={() => setDrawerOpen(false)} />
              </Box>
            </Drawer>
            <Box
              component="main"
              sx={{
                flexGrow: 1,
                minWidth: 0,
                minHeight: 0,
                display: "flex",
                flexDirection: "column",
                overflowY: "auto",
              }}
            >
              {children}
            </Box>
          </Box>
        </Box>
      </CurrentOrgContext.Provider>
    </ApolloProvider>
  );
}
