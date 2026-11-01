import React, { useRef, useState, useEffect } from "react";
import {
  Plus,
  Download,
  Upload,
  Trash2,
  Folder,
  FileText,
  Share2,
  Users,
  Eye,
  Search,
  LayoutGrid,
} from "lucide-react";
import { Dialog, Empty } from "./ui.jsx";
import { uid, friendlyError } from "../utils/chat-data.js";
import { prepareAttachment, downloadAttachment } from "../services/storage.js";
import { download, taskCsv } from "../utils/collaboration-data.js";
import Avatar from "./Avatar.jsx";
import Profile from "./Profile.jsx";
import SettingsPanel from "./SettingsPanel.jsx";
import ActionMenu from "./ActionMenu.jsx";
import FileTransferDialog from "./FileTransferDialog.jsx";
import TaskBoard from "./TaskBoard.jsx";
import CalendarPanel from "./CalendarPanel.jsx";
import Dashboard from "./Dashboard.jsx";
import { formatTime } from "../utils/time.js";
const localDate = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
export default function Collaboration({
  view,
  model,
  user,
  users,
  demo,
  preferences,
  context,
  setContext,
  onNavigate,
  onShare,
  onPreview,
  onProfile,
  onPhotoSave,
  onSetting,
  onNotice,
}) {
  const [transfer, setTransfer] = useState(null);
  const [calendarDate, setCalendarDate] = useState(localDate());
  const [dialog, setDialog] = useState(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [search, setSearch] = useState(""),
    [scope, setScope] = useState("personal"),
    [folder, setFolder] = useState(""),
    [taskFilter, setTaskFilter] = useState("All");
  useEffect(() => setSearch(""), [view]);
  useEffect(() => {
    if (context.calendarDate) setCalendarDate(context.calendarDate);
  }, [context.calendarDate]);
  useEffect(() => {
    if (context.searchToken) {
      setSearch(context.search || "");
      setFolder("");
    }
  }, [context.searchToken]);
  useEffect(() => {
    if (context.libraryScope) {
      setScope(context.libraryScope);
      setFolder("");
    }
  }, [context.libraryScope]);
  useEffect(() => {
    if (context.taskFilter) setTaskFilter(context.taskFilter);
  }, [context.taskFilter]);
  const upload = useRef();
  const main = useRef();
  useEffect(() => {
    if (main.current) {
      main.current.scrollTop = 0;
      main.current.scrollLeft = 0;
    }
  }, [view]);
  const team = model.teams[context.teamId] || Object.values(model.teams)[0];
  const workspace =
    team?.workspaces?.[context.workspaceId] ||
    Object.values(team?.workspaces || {})[0];
  const workspaceId = workspace?.id || "";
  useEffect(() => {
    if (!team && scope === "team") {
      setScope("personal");
      setFolder("");
    }
  }, [team?.id, scope]);
  const owner = team?.owner === user.id;
  const teamScope = scope === "team" && team;
  const library = teamScope ? team : model.library;
  const values = (key) =>
    Object.values(team?.[key] || {}).filter(
      (item) => item.workspaceId === workspaceId,
    );
  const tasks = values("tasks"),
    events = values("events"),
    topics = values("topics");
  const match = (value) =>
    String(value || "")
      .toLowerCase()
      .includes(search.toLowerCase());
  function open(type, item) {
    setError("");
    setDialog({ type, item });
  }
  async function run(action, success, close = true) {
    setBusy(true);
    setError("");
    try {
      await action();
      if (success) {
        onNotice(success);
      }
      if (close) setDialog(null);
      return true;
    } catch (err) {
      setError(friendlyError(err));
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function save(e) {
    e.preventDefault();
    const fields = Object.fromEntries(new FormData(e.currentTarget));
    const type = dialog.type,
      item = dialog.item,
      id = item?.id || uid(),
      now = Date.now();
    await run(
      async () => {
        if (
          ["team", "workspace", "folder"].includes(type) &&
          !fields.name.trim()
        )
          throw new Error("Enter a name.");
        if (["task", "event", "topic"].includes(type) && !fields.title.trim())
          throw new Error("Enter a title.");
        if (type === "topic" && !fields.body.trim())
          throw new Error("Write a message for this post.");
        if (type === "reply" && !fields.text.trim())
          throw new Error("Write a reply before posting.");
        if (type === "team") {
          if (!fields.name.trim()) throw new Error("Enter a team name.");
          const teamId = await model.createTeam(fields.name.trim());
          setContext({ teamId, workspaceId: "" });
          return;
        }
        if (type === "member") {
          const member = users[fields.member];
          if (!member) throw new Error("Select a registered user.");
          await model.addMember(team.id, member);
          return;
        }
        if (type === "folder") {
          await model.write(teamScope ? team.id : null, "folders", id, {
            id,
            name: fields.name.trim(),
            createdAt: now,
            createdBy: user.id,
          });
          return;
        }
        if (type === "workspace") {
          await model.write(team.id, "workspaces", id, {
            id,
            name: fields.name.trim(),
            description: fields.description.trim(),
            createdAt: item?.createdAt || now,
            createdBy: user.id,
          });
          setContext({ teamId: team.id, workspaceId: id });
          return;
        }
        if (!team || !workspace)
          throw new Error("Create a team and project workspace first.");
        if (type === "task")
          await model.write(team.id, "tasks", id, {
            id,
            title: fields.title.trim(),
            description: fields.description?.trim() || "",
            assignee: fields.assignee,
            due: fields.due,
            priority: fields.priority,
            status: fields.status,
            workspaceId,
            createdBy: item?.createdBy || user.id,
            createdAt: item?.createdAt || now,
            updatedAt: now,
          });
        if (type === "event")
          await model.write(team.id, "events", id, {
            id,
            title: fields.title.trim(),
            date: fields.date,
            time: fields.time,
            description: fields.description.trim(),
            workspaceId,
            createdAt: item?.createdAt || now,
            createdBy: item?.createdBy || user.id,
          });
        if (type === "topic")
          await model.write(team.id, "topics", id, {
            id,
            title: fields.title.trim(),
            body: fields.body.trim(),
            workspaceId,
            createdAt: now,
            createdBy: user.id,
            name: user.name,
          });
        if (type === "reply") {
          const replyId = uid();
          await model.write(
            team.id,
            "topics",
            item.id + "/replies/" + replyId,
            {
              id: replyId,
              text: fields.text.trim(),
              createdAt: now,
              createdBy: user.id,
              name: user.name,
            },
          );
          setDialog({ type: "discussion", item: { ...item } });
        }
      },
      type === "reply"
        ? "Reply posted."
        : item?.id
          ? "Changes saved."
          : type === "member"
            ? "Team member added."
            : "Created successfully.",
      type !== "reply",
    );
  }
  async function uploadFile(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const destination = teamScope ? team.id : null;
    const selectedFolder = folder;
    await run(
      async () => {
        const attachment = await prepareAttachment(file, demo);
        const id = uid();
        await model.write(destination, "files", id, {
          ...attachment,
          id,
          folderId: selectedFolder,
          createdAt: Date.now(),
          createdBy: user.id,
          workspaceId: destination ? workspaceId : "",
        });
      },
      "File uploaded to " + (destination ? "team" : "personal") + " library.",
      false,
    );
  }
  async function transferFile(
    file,
    operation,
    folderId,
    targetTeamId = teamScope ? team.id : null,
  ) {
    const sourceTeamId = teamScope ? team.id : null;
    const target = targetTeamId ? model.teams[targetTeamId] : model.library;
    if (!target)
      throw new Error(
        "That library is no longer available. Choose another library.",
      );
    if (folderId && !target.folders?.[folderId])
      throw new Error("That folder no longer exists. Choose another folder.");
    if (!library.files?.[file.id])
      throw new Error("This file is no longer in the library.");
    // Keep IDs for moves within a library; use new IDs across libraries or on copy.
    const crossLibrary = sourceTeamId !== targetTeamId;
    let name = file.name;
    if (operation === "copy") {
      const dot = name.lastIndexOf("."),
        base = dot > 0 ? name.slice(0, dot) : name,
        ext = dot > 0 ? name.slice(dot, dot + 30) : "";
      let count = 1;
      do {
        const suffix = " (copy" + (count > 1 ? " " + count : "") + ")";
        name =
          base.slice(0, Math.max(1, 300 - ext.length - suffix.length)) +
          suffix +
          ext;
        count++;
      } while (
        Object.values(target.files || {}).some(
          (f) => f.name === name && (f.folderId || "") === folderId,
        )
      );
    }
    const record = {
      ...file,
      id: operation === "copy" || crossLibrary ? uid() : file.id,
      name,
      folderId,
      ...(operation === "copy"
        ? { createdAt: Date.now(), createdBy: user.id }
        : {}),
      ...(crossLibrary
        ? {
            workspaceId: targetTeamId
              ? Object.keys(target.workspaces || {})[0] || ""
              : "",
          }
        : {}),
    };
    await model.transferFile(
      sourceTeamId,
      targetTeamId,
      file.id,
      record,
      operation === "move",
    );
    onNotice(operation === "move" ? "File moved." : "File copied.");
  }
  async function fileDownload(file) {
    await run(() => downloadAttachment(file), "Download started.", false);
  }
  async function remove() {
    const { collection, id, teamId, workspaceDelete, member } = dialog.item;
    await run(async () => {
      if (
        workspaceDelete &&
        ["tasks", "events", "topics"].some((key) =>
          Object.values(team[key] || {}).some((i) => i.workspaceId === id),
        )
      )
        throw new Error(
          "Remove this workspace’s tasks, events and discussions before deleting it.",
        );
      if (member) {
        const assigned = Object.values(team.tasks || {}).filter(
          (task) => task.assignee === id && task.status !== "Done",
        );
        if (assigned.length)
          throw new Error(
            "Reassign this member’s " +
              assigned.length +
              " unfinished tasks before removing them.",
          );
        await model.removeMember(teamId, id);
      } else await model.write(teamId, collection, id, null);
    }, "Removed successfully.");
  }
  function askRemove(collection, item, teamId = team?.id) {
    open("delete", {
      collection,
      id: item.id,
      teamId,
      workspaceDelete: collection === "workspaces",
      member: collection === "members",
    });
  }
  const displayTimestamp = (value) =>
    new Date(value).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    }) +
    " · " +
    formatTime(value, preferences.settings?.timeFormat);
  const activeTopic =
    dialog?.type === "discussion" ? team?.topics?.[dialog.item.id] : null;
  return (
    <main className="module-main" ref={main}>
      <header className="module-heading">
        <div>
          <h1>
            {{
              Storage: "Files",
              Profile: "Profile",
              Workspaces: "Projects",
              Discussions: "Board",
              Notifications: "Notifications",
            }[view] || view}
          </h1>
          <p>
            {
              {
                Dashboard: "Your chats and projects at a glance.",
                Teams: "Create a team and manage its members.",
                Workspaces: "Keep each team project organized.",
                Tasks: "Assign work, set deadlines and track progress.",
                Calendar: "Plan project meetings and deadlines.",
                Discussions:
                  "Discuss project topics and keep replies together.",
                Storage: "Upload, organize and share your project files.",
                Notifications: "Messages, calls and assigned work.",
                Settings: "Appearance and notification preferences.",
                Profile: demo
                  ? "Update your profile details."
                  : "Update your profile and password.",
              }[view]
            }
          </p>
        </div>
        {view === "Teams" && (
          <button className="primary" onClick={() => open("team")}>
            <Plus size={16} />
            Create team
          </button>
        )}
        {view === "Workspaces" && team && (
          <button className="primary" onClick={() => open("workspace")}>
            <Plus size={16} />
            New project
          </button>
        )}
        {view === "Tasks" && team && (
          <button
            className="primary"
            disabled={!workspace}
            onClick={() => open("task")}
          >
            <Plus size={16} />
            New task
          </button>
        )}
        {view === "Calendar" && team && (
          <button
            className="primary"
            disabled={!workspace}
            onClick={() => open("event", { date: calendarDate })}
          >
            <Plus size={16} />
            New event
          </button>
        )}
        {view === "Discussions" && team && (
          <button
            className="primary"
            disabled={!workspace}
            onClick={() => open("topic")}
          >
            <Plus size={16} />
            New post
          </button>
        )}
        {view === "Storage" && (
          <button
            className="primary"
            disabled={busy}
            onClick={() => upload.current.click()}
          >
            <Upload size={16} />
            {busy ? "Working…" : "Upload file"}
          </button>
        )}
      </header>
      {(error || model.error) && (
        <div className="error" role="alert">
          {error || model.error}
          <button
            className="icon-button"
            aria-label="Dismiss module error"
            onClick={() => {
              setError("");
              model.clearError();
            }}
          >
            ×
          </button>
        </div>
      )}
      {!["Profile", "Notifications", "Dashboard", "Settings"].includes(
        view,
      ) && (
        <div className="module-context compact-context">
          {!(view === "Storage" && scope === "personal") && (
            <label className="context-picker">
              <Users size={16} />
              <span className="sr-only">Team</span>
              <select
                aria-label="Selected team"
                value={team?.id || ""}
                onChange={(e) => {
                  setContext({ teamId: e.target.value, workspaceId: "" });
                  setFolder("");
                }}
              >
                <option value="" disabled>
                  No team selected
                </option>
                {Object.values(model.teams).map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          {!["Teams", "Storage", "Settings"].includes(view) && (
            <label className="context-picker">
              <LayoutGrid size={16} />
              <span className="sr-only">Project</span>
              <select
                aria-label="Selected project"
                value={workspaceId}
                onChange={(e) =>
                  setContext({ teamId: team.id, workspaceId: e.target.value })
                }
              >
                {Object.values(team?.workspaces || {}).map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="module-search context-search">
            <Search size={16} />
            <span className="sr-only">Search</span>
            <input
              aria-label="Search this section"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search this section…"
            />
          </label>
        </div>
      )}
      {model.loading && <p role="status">Loading your teams…</p>}
      {view === "Dashboard" && (
        <Dashboard
          timeFormat={preferences.settings?.timeFormat}
          teams={model.teams}
          library={model.library}
          user={user}
          users={users}
          onNavigate={onNavigate}
          onTeam={(id) => {
            setContext({ teamId: id, workspaceId: "" });
            onNavigate("Teams");
          }}
          onCalendar={(date) => {
            setContext({ ...context, calendarDate: date });
            onNavigate("Calendar");
          }}
        />
      )}
      {view === "Teams" &&
        (team ? (
          <section className="team-directory">
            <div className="section-heading">
              <div>
                <h2>{team.name}</h2>
                <p className="small-note">
                  {Object.keys(team.members || {}).length} members ·{" "}
                  {owner ? "You are the owner" : "Team member"}
                </p>
              </div>
              {owner && (
                <button className="secondary" onClick={() => open("member")}>
                  Add registered user
                </button>
              )}
            </div>
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Member</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Open tasks</th>
                    <th>
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {Object.values(team.members || {})
                    .filter((m) => match(users[m.id]?.name || m.name))
                    .map((m) => (
                      <tr key={m.id}>
                        <td>
                          <div className="member-cell">
                            <Avatar
                              className="person-initials"
                              name={users[m.id]?.name || m.name}
                              photoURL={users[m.id]?.photoURL}
                            />
                            <div>
                              <strong>{users[m.id]?.name || m.name}</strong>
                              {m.id === user.id && <small>{user.email}</small>}
                            </div>
                          </div>
                        </td>
                        <td>{m.id === team.owner ? "Owner" : "Member"}</td>
                        <td>
                          <span
                            className={
                              "member-state " +
                              (m.status === "on hold" ? "held" : "active")
                            }
                          >
                            {m.status === "on hold"
                              ? "Access paused"
                              : "Active"}
                          </span>
                        </td>
                        <td>
                          {
                            Object.values(team.tasks || {}).filter(
                              (t) => t.assignee === m.id && t.status !== "Done",
                            ).length
                          }
                        </td>
                        <td>
                          {owner && m.id !== team.owner && (
                            <ActionMenu
                              label={"Member options for " + m.name}
                              actions={[
                                {
                                  label:
                                    m.status === "on hold"
                                      ? "Restore access"
                                      : "Pause access",
                                  onSelect: () =>
                                    run(
                                      () =>
                                        model.setMemberStatus(
                                          team.id,
                                          m.id,
                                          m.status === "on hold"
                                            ? "active"
                                            : "on hold",
                                        ),
                                      m.status === "on hold"
                                        ? "Member access restored."
                                        : "Member access paused.",
                                      false,
                                    ),
                                },
                                ...(m.status !== "on hold"
                                  ? [
                                      {
                                        label: "Transfer ownership",
                                        onSelect: () => open("ownership", m),
                                      },
                                    ]
                                  : []),
                                {
                                  label: "Remove member",
                                  danger: true,
                                  onSelect: () => askRemove("members", m),
                                },
                              ]}
                            />
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : (
          <Empty title="No teams yet">
            Create a team, then add registered classmates.
          </Empty>
        ))}
      {!team &&
        ["Tasks", "Calendar", "Discussions", "Workspaces"].includes(view) && (
          <Empty title="Select or create a team">
            Use the Teams section to start a project with your classmates.
          </Empty>
        )}
      {view === "Workspaces" && team && (
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Project</th>
                <th>Progress</th>
                <th>Tasks</th>
                <th>Created</th>
                <th>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {Object.values(team.workspaces || {})
                .filter((w) => match(w.name))
                .map((w) => {
                  const projectTasks = Object.values(team.tasks || {}).filter(
                      (t) => t.workspaceId === w.id,
                    ),
                    done = projectTasks.filter(
                      (t) => t.status === "Done",
                    ).length;
                  return (
                    <tr key={w.id}>
                      <td>
                        <button
                          className="table-link"
                          onClick={() => {
                            setContext({ teamId: team.id, workspaceId: w.id });
                            onNavigate("Tasks");
                          }}
                        >
                          {w.name}
                        </button>
                        <small className="table-description">
                          {w.description || "Team project"}
                        </small>
                      </td>
                      <td>
                        <div className="project-progress">
                          <span
                            style={{
                              width:
                                (projectTasks.length
                                  ? (done / projectTasks.length) * 100
                                  : 0) + "%",
                            }}
                          />
                        </div>
                        <small>
                          {projectTasks.length
                            ? Math.round((done / projectTasks.length) * 100)
                            : 0}
                          % complete
                        </small>
                      </td>
                      <td>
                        {done} / {projectTasks.length}
                      </td>
                      <td>{new Date(w.createdAt).toLocaleDateString()}</td>
                      <td>
                        <ActionMenu
                          label={"Project options for " + w.name}
                          actions={[
                            {
                              label: "Open project",
                              onSelect: () => {
                                setContext({
                                  teamId: team.id,
                                  workspaceId: w.id,
                                });
                                onNavigate("Tasks");
                              },
                            },
                            {
                              label: "Edit project",
                              onSelect: () => open("workspace", w),
                            },
                            ...(owner
                              ? [
                                  {
                                    label: "Delete project",
                                    danger: true,
                                    onSelect: () => askRemove("workspaces", w),
                                  },
                                ]
                              : []),
                          ]}
                        />
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      )}
      {view === "Tasks" && team && (
        <TaskBoard
          tasks={tasks}
          users={users}
          user={user}
          filter={taskFilter}
          onFilter={setTaskFilter}
          search={search}
          onEdit={(t) => open("task", t)}
          onRemove={(t) => askRemove("tasks", t)}
          onStatus={(t, status) =>
            run(
              () =>
                model.write(team.id, "tasks", t.id, {
                  ...t,
                  status,
                  updatedAt: Date.now(),
                }),
              "Task status updated.",
              false,
            )
          }
          onExport={() =>
            download("flabbychat-tasks.csv", taskCsv(tasks), "text/csv")
          }
        />
      )}
      {view === "Calendar" && team && (
        <CalendarPanel
          timeFormat={preferences.settings?.timeFormat}
          events={events}
          initialDate={context.calendarDate}
          onDateChange={setCalendarDate}
          canCreate={Boolean(workspace)}
          search={search}
          onCreate={(date) => open("event", date)}
          onEdit={(e) => open("event", e)}
          onRemove={(e) => askRemove("events", e)}
        />
      )}
      {view === "Discussions" && team && (
        <>
          <div className="module-toolbar">
            <span>{topics.length} topics</span>
          </div>
          <div className="board-posts">
            {topics
              .filter((t) => match(t.title + " " + t.body))
              .sort((a, b) => b.createdAt - a.createdAt)
              .map((t) => (
                <article className="board-post" key={t.id}>
                  <div className="post-author">
                    <Avatar
                      className="person-initials"
                      name={users[t.createdBy]?.name || t.name}
                      photoURL={users[t.createdBy]?.photoURL}
                    />
                    <div>
                      <strong>{t.name}</strong>
                      <small>{displayTimestamp(t.createdAt)}</small>
                    </div>
                  </div>
                  <button
                    className="topic-open"
                    onClick={() => open("discussion", t)}
                  >
                    <h3>{t.title}</h3>
                    <p>{t.body.slice(0, 150)}</p>
                    <small>
                      {t.name} · {displayTimestamp(t.createdAt)} ·{" "}
                      {Object.keys(t.replies || {}).length} replies
                    </small>
                  </button>
                  <div className="post-footer">
                    <button
                      className="text-button"
                      onClick={() => open("discussion", t)}
                    >
                      {Object.keys(t.replies || {}).length} replies
                    </button>
                    {t.createdBy === user.id && (
                      <ActionMenu
                        label={"Post options for " + t.title}
                        actions={[
                          {
                            label: "Delete post",
                            danger: true,
                            onSelect: () => askRemove("topics", t),
                          },
                        ]}
                      />
                    )}
                  </div>
                </article>
              ))}
          </div>
          {!topics.length && (
            <Empty title="No discussions yet">
              Start a topic for questions, decisions or project ideas.
            </Empty>
          )}
        </>
      )}
      {view === "Storage" && (
        <>
          <div className="module-toolbar">
            <div className="segmented">
              <button
                className={scope === "personal" ? "active" : ""}
                onClick={() => {
                  setScope("personal");
                  setFolder("");
                }}
              >
                My files
              </button>
              <button
                className={scope === "team" ? "active" : ""}
                disabled={!team}
                onClick={() => {
                  setScope("team");
                  setFolder("");
                }}
              >
                Team files
              </button>
            </div>
            <div className="control-actions">
              <button className="secondary" onClick={() => open("folder")}>
                New folder
              </button>{" "}
            </div>
          </div>
          <p className="small-note">
            PDFs and images · {demo ? "250 KB in demo" : "5 MB per file"} ·
            Anyone with a Cloudinary file link can open it.
          </p>
          <div className="folder-list">
            <button
              className={!folder ? "selected" : ""}
              aria-pressed={!folder}
              onClick={() => setFolder("")}
            >
              <Folder size={16} />
              All files
            </button>
            {Object.values(library.folders || {}).map((f) => (
              <span key={f.id} className={folder === f.id ? "selected" : ""}>
                <button
                  className={folder === f.id ? "selected" : ""}
                  title={f.name}
                  aria-pressed={folder === f.id}
                  onClick={() => setFolder(f.id)}
                >
                  <Folder size={16} />
                  <span className="folder-label">{f.name}</span>
                </button>
                <button
                  className="icon-button"
                  aria-label={"Delete folder " + f.name}
                  onClick={() => {
                    if (
                      Object.values(library.files || {}).some(
                        (file) => file.folderId === f.id,
                      )
                    ) {
                      setError("Move or remove this folder’s files first.");
                      return;
                    }
                    askRemove("folders", f, teamScope ? team.id : null);
                  }}
                >
                  <Trash2 size={16} />
                </button>
              </span>
            ))}
          </div>
          <div className="library-grid">
            {Object.values(library.files || {})
              .filter(
                (f) => (!folder || f.folderId === folder) && match(f.name),
              )
              .map((f) => (
                <article
                  className="module-card list-record library-file"
                  key={f.id}
                >
                  <FileText size={25} />
                  <div className="file-info">
                    <strong>{f.name}</strong>
                    <small>
                      {(f.size / 1024).toFixed(0)} KB ·{" "}
                      {new Date(f.createdAt).toLocaleDateString()}
                    </small>
                  </div>
                  <div
                    className="file-actions"
                    aria-label={"Actions for " + f.name}
                  >
                    <button
                      className="icon-button"
                      aria-label={"Preview " + f.name}
                      title="Preview"
                      onClick={() => onPreview(f)}
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      className="icon-button"
                      aria-label={"Download " + f.name}
                      title="Download"
                      onClick={() => fileDownload(f)}
                    >
                      <Download size={16} />
                    </button>
                    <button
                      className="icon-button"
                      aria-label={"Share " + f.name}
                      title="Share in chat"
                      onClick={() => onShare(f)}
                    >
                      <Share2 size={16} />
                    </button>
                    <ActionMenu
                      label={"File options for " + f.name}
                      actions={[
                        {
                          label: "Make a copy",
                          onSelect: () =>
                            run(
                              () => transferFile(f, "copy", f.folderId || ""),
                              null,
                              false,
                            ),
                        },
                        {
                          label: "Copy to…",
                          onSelect: () =>
                            setTransfer({ file: f, operation: "copy" }),
                        },
                        {
                          label: "Move to…",
                          onSelect: () =>
                            setTransfer({ file: f, operation: "move" }),
                        },
                        {
                          label: "Remove file",
                          danger: true,
                          onSelect: () =>
                            askRemove("files", f, teamScope ? team.id : null),
                        },
                      ]}
                    />
                  </div>
                </article>
              ))}
          </div>
          {Object.keys(library.files || {}).length > 0 &&
            !Object.values(library.files || {}).some(
              (f) => (!folder || f.folderId === folder) && match(f.name),
            ) && (
              <Empty
                title={search ? "No matching files" : "This folder is empty"}
              >
                {search
                  ? "Try another file name or clear the search."
                  : "Upload a file here or move one into this folder."}
              </Empty>
            )}
          {!Object.keys(library.files || {}).length && (
            <Empty title="Your library is empty">
              Upload a PDF or image to keep it here, then share it into a chat
              when needed.
            </Empty>
          )}
          <input
            ref={upload}
            hidden
            aria-label="Upload library file"
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif,application/pdf"
            onChange={uploadFile}
          />
        </>
      )}
      {view === "Profile" && (
        <Profile
          user={user}
          demo={demo}
          onSave={onProfile}
          onPhotoSave={onPhotoSave}
          onNotice={onNotice}
        />
      )}
      {view === "Settings" && (
        <SettingsPanel
          preferences={preferences}
          onSetting={onSetting}
          run={run}
        />
      )}
      {transfer && (
        <FileTransferDialog
          {...transfer}
          sourceLibrary={teamScope ? team.id : "personal"}
          libraries={[
            {
              id: "personal",
              name: "My files",
              folders: model.library.folders,
            },
            ...Object.values(model.teams).map((item) => ({
              id: item.id,
              name: "Team files · " + item.name,
              folders: item.folders,
            })),
          ]}
          onClose={() => setTransfer(null)}
          onTransfer={(file, operation, folderId, destination) =>
            transferFile(
              file,
              operation,
              folderId,
              destination === "personal" ? null : destination,
            )
          }
        />
      )}
      {dialog && (
        <Dialog
          title={
            {
              team: "Create team",
              ownership: "Transfer team ownership",
              member: "Add team member",
              workspace: dialog.item ? "Edit project" : "New project",
              task: dialog.item ? "Edit task" : "New task",
              event: dialog.item?.id ? "Edit event" : "New event",
              topic: "New post",
              reply: "Reply to discussion",
              discussion: activeTopic?.title || "Discussion",
              folder: "New folder",
              delete: "Remove this item?",
            }[dialog.type]
          }
          onClose={() => {
            if (!busy) {
              setDialog(null);
              setError("");
            }
          }}
        >
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          {dialog.type === "ownership" ? (
            <>
              <p className="verification-copy">
                Make <strong>{dialog.item.name}</strong> the owner of{" "}
                <strong>{team.name}</strong>? You will remain a member and lose
                owner-only management actions.
              </p>
              <div className="dialog-actions">
                <button
                  className="secondary"
                  disabled={busy}
                  onClick={() => setDialog(null)}
                >
                  Cancel
                </button>
                <button
                  className="primary"
                  disabled={busy}
                  onClick={() =>
                    run(
                      () => model.transferOwnership(team.id, dialog.item.id),
                      "Team ownership transferred.",
                    )
                  }
                >
                  {busy ? "Transferring…" : "Transfer ownership"}
                </button>
              </div>
            </>
          ) : dialog.type === "delete" ? (
            <>
              <p className="verification-copy">
                This removes the selected record. Uploaded Cloudinary files
                remain in your Cloudinary account.
              </p>
              <div className="dialog-actions">
                <button
                  className="secondary"
                  disabled={busy}
                  onClick={() => setDialog(null)}
                >
                  Cancel
                </button>
                <button className="danger" disabled={busy} onClick={remove}>
                  {busy ? "Removing…" : "Remove"}
                </button>
              </div>
            </>
          ) : dialog.type === "discussion" ? (
            <>
              <p className="discussion-body">
                {activeTopic?.body || "This post is no longer available."}
              </p>
              {activeTopic && (
                <div className="discussion-meta">
                  <strong>{activeTopic.name}</strong>
                  <time
                    dateTime={new Date(activeTopic.createdAt).toISOString()}
                  >
                    {displayTimestamp(activeTopic.createdAt)}
                  </time>
                </div>
              )}
              {Object.values(activeTopic?.replies || {})
                .sort((a, b) => a.createdAt - b.createdAt)
                .map((r) => (
                  <article className="discussion-reply" key={r.id}>
                    <strong>{r.name}</strong>
                    <p>{r.text}</p>
                    <time dateTime={new Date(r.createdAt).toISOString()}>
                      {displayTimestamp(r.createdAt)}
                    </time>
                    {r.createdBy === user.id && (
                      <button
                        className="icon-button"
                        aria-label="Delete your reply"
                        onClick={() =>
                          run(
                            () =>
                              model.write(
                                team.id,
                                "topics",
                                activeTopic.id + "/replies/" + r.id,
                                null,
                              ),
                            "Reply removed.",
                            false,
                          )
                        }
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </article>
                ))}
              <div className="dialog-actions">
                <button
                  className="primary"
                  disabled={!activeTopic || busy}
                  onClick={() => open("reply", activeTopic)}
                >
                  Write a reply
                </button>
              </div>
            </>
          ) : (
            <form onSubmit={save}>
              {["team", "workspace", "folder"].includes(dialog.type) && (
                <label>
                  Name
                  <input
                    name="name"
                    maxLength={80}
                    required
                    defaultValue={dialog.item?.name || ""}
                  />
                </label>
              )}
              {dialog.type === "workspace" && (
                <label>
                  Description
                  <textarea
                    name="description"
                    maxLength={200}
                    defaultValue={dialog.item?.description || ""}
                  />
                </label>
              )}
              {dialog.type === "member" && (
                <label>
                  Registered user
                  <select name="member" required defaultValue="">
                    <option value="" disabled>
                      Choose a user
                    </option>
                    {Object.values(users)
                      .filter((u) => !team.members?.[u.id])
                      .map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name}
                        </option>
                      ))}
                  </select>
                </label>
              )}
              {["task", "event", "topic"].includes(dialog.type) && (
                <label>
                  Title
                  <input
                    name="title"
                    required
                    maxLength={160}
                    defaultValue={dialog.item?.title || ""}
                  />
                </label>
              )}
              {dialog.type === "task" && (
                <>
                  <label>
                    Details
                    <textarea
                      name="description"
                      maxLength={1000}
                      defaultValue={dialog.item?.description || ""}
                    />
                  </label>
                  <label>
                    Assignee
                    <select
                      name="assignee"
                      defaultValue={dialog.item?.assignee || user.id}
                    >
                      {Object.values(team.members || {})
                        .filter(
                          (m) =>
                            m.status !== "on hold" ||
                            m.id === dialog.item?.assignee,
                        )
                        .map((m) => (
                          <option value={m.id} key={m.id}>
                            {users[m.id]?.name || m.name}
                          </option>
                        ))}
                    </select>
                  </label>
                  <div className="form-row">
                    <label>
                      Deadline
                      <input
                        type="date"
                        name="due"
                        required
                        defaultValue={dialog.item?.due || localDate()}
                      />
                    </label>
                    <label>
                      Priority
                      <select
                        name="priority"
                        defaultValue={dialog.item?.priority || "Medium"}
                      >
                        {["Low", "Medium", "High"].map((p) => (
                          <option key={p}>{p}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <label>
                    Status
                    <select
                      name="status"
                      defaultValue={dialog.item?.status || "To do"}
                    >
                      {["To do", "In progress", "Done"].map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </label>
                </>
              )}
              {dialog.type === "event" && (
                <>
                  <div className="form-row">
                    <label>
                      Date
                      <input
                        name="date"
                        type="date"
                        required
                        defaultValue={dialog.item?.date || localDate()}
                      />
                    </label>
                    <label>
                      Time
                      <input
                        name="time"
                        type="time"
                        required
                        defaultValue={dialog.item?.time || "10:00"}
                      />
                    </label>
                  </div>
                  <label>
                    Description
                    <textarea
                      name="description"
                      maxLength={500}
                      defaultValue={dialog.item?.description || ""}
                    />
                  </label>
                </>
              )}
              {dialog.type === "topic" && (
                <label>
                  Discussion
                  <textarea name="body" maxLength={5000} required />
                </label>
              )}
              {dialog.type === "reply" && (
                <label>
                  Your reply
                  <textarea name="text" maxLength={3000} required />
                </label>
              )}
              <div className="dialog-actions">
                <button
                  type="button"
                  className="secondary"
                  disabled={busy}
                  onClick={() => setDialog(null)}
                >
                  Cancel
                </button>
                <button className="primary" disabled={busy}>
                  {busy
                    ? "Saving…"
                    : dialog.item?.id && dialog.type !== "reply"
                      ? "Save changes"
                      : "Create"}
                </button>
              </div>
            </form>
          )}
        </Dialog>
      )}
    </main>
  );
}
