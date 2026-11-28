"use client";

import { useMutation, useQuery } from "@apollo/client/react";
import PersonRemoveIcon from "@mui/icons-material/PersonRemove";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemAvatar from "@mui/material/ListItemAvatar";
import ListItemText from "@mui/material/ListItemText";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { useRouter } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";
import { forgetBoardAudiences } from "../board-cache";
import { errorMessage, useNotify } from "../notify";
import {
  AddWorkspaceMemberMutation,
  DeleteWorkspaceMutation,
  MeQuery,
  WorkspaceQuery,
  WorkspacesQuery,
  RemoveWorkspaceMemberMutation,
  RenameWorkspaceMutation,
} from "../operations";
import { UserAvatar } from "./UserAvatar";
import { ConfirmDelete } from "./ConfirmDelete";
import { EditableTitle } from "./EditableTitle";
import { NotFound, PageContainer } from "./OrgPages";
import { PageLoading } from "./PageLoading";
import { MemberBadges } from "./MemberBadges";
import { formatDate } from "@/lib/format-date";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, mb: 3 }}>
      <Typography variant="h6" component="h2" sx={{ mb: 2 }}>
        {title}
      </Typography>
      {children}
    </Paper>
  );
}

/** /w/[orgId]/settings: name, members, leaving and deleting. */
export function OrgSettings({ orgId }: { orgId: string }) {
  const router = useRouter();
  const notify = useNotify();
  const { data, loading, error } = useQuery(WorkspaceQuery, { variables: { id: orgId } });
  const { data: me } = useQuery(MeQuery);
  const [email, setEmail] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<"leave" | "delete" | null>(null);
  // Workspace members can open every board in it, so cached boards' member lists (the card
  // dialog's assignee choices) are refetched after these.
  const [addMember, { loading: adding }] = useMutation(AddWorkspaceMemberMutation, {
    update: (cache) => forgetBoardAudiences(cache),
  });
  // The member whose removal is being confirmed. It's kept after the dialog closes, so the
  // title doesn't go blank while the dialog fades out; `removeOpen` says whether it's showing.
  const [toRemove, setToRemove] = useState<{ id: string; label: string } | null>(null);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [removeMember, { loading: removing }] = useMutation(RemoveWorkspaceMemberMutation, {
    update: (cache) => forgetBoardAudiences(cache, { assignees: true }),
  });
  const [renameOrg] = useMutation(RenameWorkspaceMutation);
  // Leaving or deleting changes which organizations you have, so refresh that list.
  const [leaveOrg, { loading: leaving }] = useMutation(RemoveWorkspaceMemberMutation, {
    update: (cache) => forgetBoardAudiences(cache, { assignees: true }),
    refetchQueries: [WorkspacesQuery],
    awaitRefetchQueries: true,
  });
  const [deleteOrg, { loading: deleting }] = useMutation(DeleteWorkspaceMutation, {
    refetchQueries: [WorkspacesQuery],
    awaitRefetchQueries: true,
  });

  if (error)
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {error.message}
      </Alert>
    );
  if (loading && !data) return <PageLoading label="Loading workspace settings" />;
  const org = data?.workspace;
  if (!org) return <NotFound what="workspace" />;
  const myId = me?.me?.id;
  const boardCount = org.projects.reduce((n, p) => n + p.boards.length, 0);
  const joinedAt = new Map(org.memberships.map((m) => [m.user.id, new Date(m.joinedAt)]));

  async function add(e: FormEvent) {
    e.preventDefault();
    setAddError(null);
    try {
      await addMember({ variables: { workspaceId: orgId, email: email.trim() } });
      notify(`Added ${email.trim()}`, "success");
      setEmail("");
    } catch (err) {
      setAddError(errorMessage(err));
    }
  }

  return (
    <PageContainer>
      <Typography color="text.secondary">Workspace Settings</Typography>
      <Box sx={{ mb: 3, ml: -0.75 }}>
        {org.viewerIsOwner ? (
          <EditableTitle
            value={org.name}
            ariaLabel="Workspace name"
            variant="h5"
            onSave={(name) =>
              renameOrg({
                variables: { id: org.id, name },
                optimisticResponse: {
                  renameWorkspace: { __typename: "Workspace", id: org.id, name },
                },
              }).catch((err) => notify(errorMessage(err)))
            }
          />
        ) : (
          <Typography variant="h5" component="h1" sx={{ fontWeight: 700, px: 0.75 }}>
            {org.name}
          </Typography>
        )}
      </Box>

      <Section title={`Members (${org.members.length})`}>
        <Typography color="text.secondary" variant="body2" sx={{ mb: 2 }}>
          Members can open every board in this workspace&apos;s projects and add other people.
        </Typography>
        <Stack component="form" onSubmit={add} direction="row" spacing={1} sx={{ mb: 1 }}>
          <TextField
            size="small"
            type="email"
            label="Add by Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={!!addError}
            helperText={addError ?? "They need to have signed in to Maple Flow once."}
            fullWidth
            required
          />
          <Button
            type="submit"
            variant="contained"
            disabled={adding || !email.trim()}
            sx={{ alignSelf: "flex-start", height: 40 }}
          >
            Add
          </Button>
        </Stack>
        <List dense>
          {org.members.map((m) => {
            const isOwner = m.id === org.owner.id;
            const isMe = m.id === myId;
            const joined = joinedAt.get(m.id);
            return (
              <ListItem
                key={m.id}
                disableGutters
                secondaryAction={
                  !isOwner && org.viewerIsOwner && !isMe ? (
                    <Tooltip title="Remove from Workspace">
                      <IconButton
                        edge="end"
                        aria-label={`Remove ${m.email}`}
                        onClick={() => {
                          setToRemove({ id: m.id, label: m.name ?? m.email });
                          setRemoveOpen(true);
                        }}
                      >
                        <PersonRemoveIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  ) : null
                }
              >
                <ListItemAvatar>
                  <UserAvatar user={m} size={40} alt="" />
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Stack
                      component="span"
                      direction="row"
                      spacing={1}
                      sx={{ alignItems: "center" }}
                    >
                      <span>{m.name ?? m.email}</span>
                      {joined && <MemberBadges joinedAt={joined} />}
                      {isOwner && <Chip size="small" label="Owner" />}
                      {isMe && <Chip size="small" variant="outlined" label="You" />}
                    </Stack>
                  }
                  secondary={joined ? `${m.email} · Joined ${formatDate(joined)}` : m.email}
                  slotProps={{ secondary: { noWrap: true } }}
                />
              </ListItem>
            );
          })}
        </List>
      </Section>

      {org.viewerIsOwner ? (
        <Section title="Delete Workspace">
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Permanently deletes {org.name}, its {org.projects.length} project
            {org.projects.length === 1 ? "" : "s"} and {boardCount} board
            {boardCount === 1 ? "" : "s"}, for every member. It can&apos;t be undone.
          </Typography>
          <Button color="error" variant="outlined" onClick={() => setConfirm("delete")}>
            Delete Workspace
          </Button>
        </Section>
      ) : (
        <Section title="Leave Workspace">
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            You&apos;ll lose access to its boards, except any you were invited to as a guest.
          </Typography>
          <Button color="error" variant="outlined" onClick={() => setConfirm("leave")}>
            Leave Workspace
          </Button>
        </Section>
      )}

      <ConfirmDelete
        open={confirm === "delete"}
        title={`Delete “${org.name}”?`}
        busy={deleting}
        onClose={() => setConfirm(null)}
        onConfirm={async () => {
          try {
            await deleteOrg({ variables: { id: org.id } });
            notify(`Deleted “${org.name}”`, "success");
            router.push("/boards");
          } catch (err) {
            notify(errorMessage(err));
          }
        }}
      >
        This permanently deletes the workspace with all {org.projects.length} project
        {org.projects.length === 1 ? "" : "s"} and {boardCount} board{boardCount === 1 ? "" : "s"},
        including their lists and cards. All {org.members.length} member
        {org.members.length === 1 ? "" : "s"} lose access. It can&apos;t be undone.
      </ConfirmDelete>
      <ConfirmDelete
        open={confirm === "leave"}
        title={`Leave “${org.name}”?`}
        confirmLabel="Leave Workspace"
        busy={leaving}
        onClose={() => setConfirm(null)}
        onConfirm={async () => {
          if (!myId) return;
          try {
            await leaveOrg({ variables: { workspaceId: org.id, userId: myId } });
            notify(`You left “${org.name}”`, "success");
            router.push("/boards");
          } catch (err) {
            notify(errorMessage(err));
          }
        }}
      >
        You&apos;ll lose access to its projects and boards. A member can add you back later.
      </ConfirmDelete>
      <ConfirmDelete
        open={removeOpen}
        title={`Remove ${toRemove?.label ?? ""} from “${org.name}”?`}
        confirmLabel="Remove Member"
        busy={removing}
        onClose={() => setRemoveOpen(false)}
        onConfirm={async () => {
          if (!toRemove) return;
          try {
            await removeMember({ variables: { workspaceId: orgId, userId: toRemove.id } });
            notify(`Removed ${toRemove.label}`, "success");
            setRemoveOpen(false);
          } catch (err) {
            notify(errorMessage(err));
          }
        }}
      >
        They&apos;ll lose access to this workspace&apos;s projects and boards, and be removed from
        every card they&apos;re assigned to on those boards. Boards they were invited to as a guest
        stay open to them, along with their assignments there. You can add them back later, but
        their card assignments won&apos;t come back.
      </ConfirmDelete>
    </PageContainer>
  );
}
