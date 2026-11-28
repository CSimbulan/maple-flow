"use client";

import { useMutation, useQuery } from "@apollo/client/react";
import AddIcon from "@mui/icons-material/Add";
import CheckIcon from "@mui/icons-material/Check";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import ListSubheader from "@mui/material/ListSubheader";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import { usePathname, useRouter } from "next/navigation";
import { HOME_PATH } from "@/lib/start-page";
import { useState } from "react";
import { useCurrentOrg } from "../current-org";
import { errorMessage, useNotify } from "../notify";
import { CreateWorkspaceMutation, WorkspacesQuery } from "../operations";
import { NameDialog } from "./NameDialog";

/** Top-bar button showing the current organization, with a menu to switch or create one. */
export function OrgSwitcher() {
  const router = useRouter();
  const notify = useNotify();
  const { orgId } = useCurrentOrg();
  // The home page spans every workspace: the button reads "Workspaces" and looks unselected.
  const onHome = usePathname() === HOME_PATH;
  const { data } = useQuery(WorkspacesQuery);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [creating, setCreating] = useState(false);
  const [createOrg] = useMutation(CreateWorkspaceMutation, {
    refetchQueries: [WorkspacesQuery],
  });

  const orgs = data?.workspaces ?? [];
  const current = orgs.find((o) => o.id === orgId);

  return (
    <>
      <Button
        color="inherit"
        endIcon={<ExpandMoreIcon />}
        onClick={(e) => setAnchor(e.currentTarget)}
        aria-label={current ? `Workspace: ${current.name}` : "Workspaces"}
        sx={{
          minWidth: 0,
          maxWidth: { xs: 150, sm: 260 },
          bgcolor: onHome ? "transparent" : "rgba(255,255,255,0.15)",
          "&:hover": { bgcolor: onHome ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.25)" },
        }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {current?.name ?? "Workspaces"}
        </span>
      </Button>
      <Menu
        anchorEl={anchor}
        open={!!anchor}
        onClose={() => setAnchor(null)}
        slotProps={{ list: { dense: true, sx: { minWidth: 240 } } }}
      >
        <ListSubheader>Workspaces</ListSubheader>
        {orgs.map((o) => (
          <MenuItem
            key={o.id}
            selected={o.id === orgId}
            onClick={() => {
              setAnchor(null);
              router.push(`/w/${o.id}`);
            }}
          >
            <ListItemIcon>{o.id === orgId && <CheckIcon fontSize="small" />}</ListItemIcon>
            <ListItemText primary={o.name} secondary={o.viewerIsOwner ? "Owner" : "Member"} />
          </MenuItem>
        ))}
        <Divider />
        <MenuItem
          onClick={() => {
            setAnchor(null);
            setCreating(true);
          }}
        >
          <ListItemIcon>
            <AddIcon fontSize="small" />
          </ListItemIcon>
          Create Workspace
        </MenuItem>
      </Menu>
      {creating && (
        <NameDialog
          title="Create Workspace"
          label="Workspace Name"
          help="You'll be its owner. It starts with one project, “General”."
          onClose={() => setCreating(false)}
          onSubmit={async (name) => {
            try {
              const { data } = await createOrg({ variables: { name } });
              if (data) router.push(`/w/${data.createWorkspace.id}`);
              return true;
            } catch (err) {
              notify(errorMessage(err));
              return false;
            }
          }}
        />
      )}
    </>
  );
}
