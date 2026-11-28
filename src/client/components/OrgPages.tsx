"use client";

import { useMutation, useQuery } from "@apollo/client/react";
import FolderOutlinedIcon from "@mui/icons-material/FolderOutlined";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Breadcrumbs from "@mui/material/Breadcrumbs";
import Button from "@mui/material/Button";
import ButtonBase from "@mui/material/ButtonBase";
import Container from "@mui/material/Container";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { BRAND } from "@/brand";
import { useShowOrg } from "../current-org";
import { errorMessage, useNotify } from "../notify";
import {
  CreateProjectMutation,
  DeleteProjectMutation,
  WorkspaceQuery,
  ProjectQuery,
  RenameProjectMutation,
} from "../operations";
import { AddTile, BoardTiles, TileGrid, tileSx } from "./BoardTiles";
import { ConfirmDelete } from "./ConfirmDelete";
import { EditableTitle } from "./EditableTitle";
import { NameDialog } from "./NameDialog";
import { PageLoading } from "./PageLoading";
import { formatDate } from "@/lib/format-date";

export function PageContainer({ children }: { children: ReactNode }) {
  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2, sm: 4 } }}>
      {children}
    </Container>
  );
}

export function NotFound({ what }: { what: string }) {
  return (
    <PageContainer>
      <Alert
        severity="info"
        action={
          <Button component={Link} href="/boards" color="inherit" size="small">
            Go Home
          </Button>
        }
      >
        This {what} doesn&apos;t exist or you don&apos;t have access to it.
      </Alert>
    </PageContainer>
  );
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** /w/[orgId]: the organization's projects. */
export function OrgOverview({ orgId }: { orgId: string }) {
  const router = useRouter();
  const notify = useNotify();
  const { data, loading, error } = useQuery(WorkspaceQuery, { variables: { id: orgId } });
  const [creating, setCreating] = useState(false);
  const [createProject] = useMutation(CreateProjectMutation);

  if (error)
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {error.message}
      </Alert>
    );
  if (loading && !data) return <PageLoading />;
  const org = data?.workspace;
  if (!org) return <NotFound what="workspace" />;

  return (
    <PageContainer>
      <Typography variant="h5" component="h1" sx={{ fontWeight: 700 }}>
        {org.name}
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        {plural(org.members.length, "member")} · Created {formatDate(org.createdAt)} ·{" "}
        <Link href={`/w/${org.id}/settings`} style={{ color: "inherit" }}>
          Members & Settings
        </Link>
      </Typography>
      <Typography variant="h6" component="h2" sx={{ mb: 1.5 }}>
        Projects
      </Typography>
      <TileGrid>
        {org.projects.map((p) => (
          <ButtonBase
            key={p.id}
            component={Link}
            href={`/w/${org.id}/p/${p.id}`}
            sx={{
              ...tileSx,
              flexDirection: "column",
              justifyContent: "space-between",
              border: 1,
              borderColor: "divider",
              bgcolor: "background.paper",
              "&:hover": { borderColor: "primary.main", bgcolor: BRAND.warmWhite },
            }}
          >
            <Stack
              direction="row"
              spacing={1}
              sx={{ alignItems: "center", minWidth: 0, width: "100%" }}
            >
              <FolderOutlinedIcon fontSize="small" color="primary" />
              <Typography noWrap sx={{ fontWeight: 700 }}>
                {p.name}
              </Typography>
            </Stack>
            <Typography variant="caption" color="text.secondary">
              {plural(p.boards.length, "board")}
            </Typography>
          </ButtonBase>
        ))}
        <AddTile label="New Project" onClick={() => setCreating(true)} />
      </TileGrid>
      {creating && (
        <NameDialog
          title="New Project"
          label="Project Name"
          onClose={() => setCreating(false)}
          onSubmit={async (name) => {
            try {
              const { data } = await createProject({ variables: { workspaceId: org.id, name } });
              if (data) router.push(`/w/${org.id}/p/${data.createProject.project.id}`);
              return true;
            } catch (err) {
              notify(errorMessage(err));
              return false;
            }
          }}
        />
      )}
    </PageContainer>
  );
}

/** /w/[orgId]/p/[projectId]: the project's boards. */
export function ProjectPage({ projectId }: { projectId: string }) {
  const router = useRouter();
  const notify = useNotify();
  const { data, loading, error } = useQuery(ProjectQuery, {
    variables: { id: projectId },
    // Boards may have been created or deleted elsewhere since this was last open.
    fetchPolicy: "cache-and-network",
  });
  const project = data?.project;
  useShowOrg(project?.workspace.id);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [renameProject] = useMutation(RenameProjectMutation);
  const [deleteProject, { loading: deleting }] = useMutation(DeleteProjectMutation);

  if (error)
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {error.message}
      </Alert>
    );
  if (loading && !data) return <PageLoading />;
  if (!project) return <NotFound what="project" />;
  const org = project.workspace;

  return (
    <PageContainer>
      <Breadcrumbs sx={{ mb: 0.5 }}>
        <Typography
          component={Link}
          href={`/w/${org.id}`}
          sx={{
            color: "text.secondary",
            textDecoration: "none",
            "&:hover": { textDecoration: "underline" },
          }}
        >
          {org.name}
        </Typography>
        <Typography color="text.secondary">Project</Typography>
      </Breadcrumbs>
      <Stack direction="row" sx={{ alignItems: "center", gap: 1 }}>
        <Box sx={{ minWidth: 0, flexGrow: 1, ml: -0.75 }}>
          <EditableTitle
            value={project.name}
            ariaLabel="Project name"
            variant="h5"
            noWrap
            onSave={(name) =>
              renameProject({
                variables: { id: project.id, name },
                optimisticResponse: {
                  renameProject: { __typename: "Project", id: project.id, name },
                },
              }).catch((err) => notify(errorMessage(err)))
            }
          />
        </Box>
        {org.viewerIsOwner && (
          <IconButton aria-label="Project menu" onClick={(e) => setMenuAnchor(e.currentTarget)}>
            <MoreHorizIcon />
          </IconButton>
        )}
      </Stack>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        {plural(project.boards.length, "board")} · Created {formatDate(project.createdAt)}
      </Typography>
      <Menu anchorEl={menuAnchor} open={!!menuAnchor} onClose={() => setMenuAnchor(null)}>
        <MenuItem
          sx={{ color: "error.main" }}
          onClick={() => {
            setMenuAnchor(null);
            setConfirmDelete(true);
          }}
        >
          Delete Project
        </MenuItem>
      </Menu>
      <BoardTiles boards={project.boards} projectId={project.id} />
      <ConfirmDelete
        open={confirmDelete}
        title={`Delete Project “${project.name}”?`}
        busy={deleting}
        onClose={() => setConfirmDelete(false)}
        onConfirm={async () => {
          try {
            await deleteProject({ variables: { id: project.id } });
            notify(`Deleted project “${project.name}”`, "success");
            router.push(`/w/${org.id}`);
          } catch (err) {
            notify(errorMessage(err));
          }
        }}
      >
        This permanently deletes the project
        {project.boards.length > 0
          ? ` and its ${plural(project.boards.length, "board")}, with all their lists and cards`
          : ""}
        , for everyone in {org.name}. It can&apos;t be undone.
      </ConfirmDelete>
    </PageContainer>
  );
}
