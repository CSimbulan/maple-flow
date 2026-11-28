"use client";

import { useMutation, useQuery } from "@apollo/client/react";
import AddIcon from "@mui/icons-material/Add";
import DashboardOutlinedIcon from "@mui/icons-material/DashboardOutlined";
import FolderOutlinedIcon from "@mui/icons-material/FolderOutlined";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import PeopleOutlineIcon from "@mui/icons-material/PeopleOutlined";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import ListSubheader from "@mui/material/ListSubheader";
import Skeleton from "@mui/material/Skeleton";
import Tooltip from "@mui/material/Tooltip";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { HOME_PATH } from "@/lib/start-page";
import { useCurrentOrg } from "../current-org";
import { errorMessage, useNotify } from "../notify";
import { CreateProjectMutation, WorkspaceQuery, SharedBoardsQuery } from "../operations";
import { NameDialog } from "./NameDialog";

/** The current organization's projects and settings, plus boards shared with the viewer. */
export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const notify = useNotify();
  const { orgId } = useCurrentOrg();
  const { data, loading } = useQuery(WorkspaceQuery, {
    variables: { id: orgId ?? "" },
    skip: !orgId,
  });
  const { data: shared } = useQuery(SharedBoardsQuery);
  const [creating, setCreating] = useState(false);
  const [createProject] = useMutation(CreateProjectMutation);

  const org = data?.workspace;
  const sharedBoards = shared?.sharedBoards ?? [];
  const item = (href: string, exact = false) => ({
    component: Link,
    href,
    onClick: onNavigate,
    selected: exact ? pathname === href : pathname.startsWith(href),
  });

  return (
    <Box component="nav" aria-label="Workspace" sx={{ overflowY: "auto", height: "100%" }}>
      <List dense>
        <ListItemButton {...item(HOME_PATH, true)}>
          <ListItemIcon>
            <HomeOutlinedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Home" />
        </ListItemButton>
        {orgId && !org && loading && (
          <Box sx={{ px: 2, py: 1 }}>
            <Skeleton width="70%" />
            <Skeleton width="50%" />
          </Box>
        )}
        {org && (
          <>
            <ListSubheader sx={{ fontWeight: 700, color: "text.primary", lineHeight: "40px" }}>
              {org.name}
            </ListSubheader>
            <ListItemButton {...item(`/w/${org.id}`, true)}>
              <ListItemIcon>
                <DashboardOutlinedIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary="Overview" />
            </ListItemButton>
            <ListItemButton {...item(`/w/${org.id}/settings`)}>
              <ListItemIcon>
                <PeopleOutlineIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary="Members & Settings" />
            </ListItemButton>

            <ListSubheader sx={{ display: "flex", alignItems: "center", mt: 1 }}>
              <Box sx={{ flexGrow: 1 }}>Projects</Box>
              <Tooltip title="New Project">
                <IconButton
                  size="small"
                  edge="end"
                  aria-label="New Project"
                  onClick={() => setCreating(true)}
                >
                  <AddIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </ListSubheader>
            {org.projects.map((p) => (
              <ListItemButton key={p.id} {...item(`/w/${org.id}/p/${p.id}`)}>
                <ListItemIcon>
                  <FolderOutlinedIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText
                  primary={p.name}
                  secondary={`${p.boards.length} board${p.boards.length === 1 ? "" : "s"}`}
                  slotProps={{ primary: { noWrap: true } }}
                />
              </ListItemButton>
            ))}
          </>
        )}

        {sharedBoards.length > 0 && (
          <>
            <ListSubheader sx={{ mt: 1 }}>Shared with Me</ListSubheader>
            {sharedBoards.map((b) => (
              <ListItemButton key={b.id} {...item(`/b/${b.id}`)}>
                <ListItemIcon>
                  <Box sx={{ width: 16, height: 16, borderRadius: 0.5, bgcolor: b.background }} />
                </ListItemIcon>
                <ListItemText primary={b.title} slotProps={{ primary: { noWrap: true } }} />
              </ListItemButton>
            ))}
          </>
        )}
      </List>

      {creating && org && (
        <NameDialog
          title="New Project"
          label="Project Name"
          onClose={() => setCreating(false)}
          onSubmit={async (name) => {
            try {
              const { data } = await createProject({ variables: { workspaceId: org.id, name } });
              if (data) {
                onNavigate?.();
                router.push(`/w/${org.id}/p/${data.createProject.project.id}`);
              }
              return true;
            } catch (err) {
              notify(errorMessage(err));
              return false;
            }
          }}
        />
      )}
    </Box>
  );
}
