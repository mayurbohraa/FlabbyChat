import React, { useRef, useState, useEffect } from "react";
import {
  Plus,
  Download,
  Upload,
  Trash2,
  Edit2,
  Folder,
  FileText,
  Share2,
  Check,
  MessageCircle,
  FolderOpen,
  Users,
  ArrowRight,
  Eye,
} from "lucide-react";
import { Dialog, Empty } from "./ui.jsx";
import { uid, friendlyError } from "../utils/chat-data.js";
import { prepareAttachment, downloadAttachment } from "../services/storage.js";
import {
  download,
  taskCsv,
  validateBackup,
} from "../utils/collaboration-data.js";
import Profile from "./Profile.jsx";
import SettingsPanel from "./SettingsPanel.jsx";
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
  onMenu,
  onShare,
  onPreview,
  onProfile,
  onSetting,
  notifications,
  onNotice,
}) {
  const [dialog, setDialog] = useState(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [search, setSearch] = useState(""),
    [scope, setScope] = useState("personal"),
    [folder, setFolder] = useState(""),
    [taskFilter, setTaskFilter] = useState("All"),
    [month, setMonth] = useState(localDate().slice(0, 7)),
    [backup, setBackup] = useState(null);
  useEffect(() => setSearch(""), [view]);
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
  async function fileDownload(file) {
    await run(() => downloadAttachment(file), "Download started.", false);
  }
  async function selectImport(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      setError("Choose a JSON backup smaller than 8 MB.");
      return;
    }
    try {
      const next = validateBackup(await file.text());
      setBackup(next);
      open("import");
    } catch (err) {
      setError(friendlyError(err));
    }
  }
  async function importRecords() {
    await run(async () => {
      if (backup.project && !team)
        throw new Error("Select a team before importing project records.");
      const operations = [];
      const queue = (teamId, collection, id, value) =>
        operations.push({ teamId, collection, id, value });
      const now = Date.now();
      const folderMap = new Map(),
        workspaceMap = new Map();
      for (const f of Object.values(backup.library?.folders || {})) {
        const id = uid();
        folderMap.set(f.id, id);
        queue(null, "folders", id, {
          id,
          name: f.name,
          createdAt: now,
          createdBy: user.id,
        });
      }
      for (const f of Object.values(backup.library?.files || {})) {
        const id = uid();
        queue(null, "files", id, {
          id,
          name: f.name,
          url: f.url,
          kind: f.kind,
          size: f.size,
          folderId: folderMap.get(f.folderId) || "",
          createdAt: now,
          createdBy: user.id,
          workspaceId: "",
        });
      }
      if (backup.project) {
        if (!team)
          throw new Error("Select a team before importing project records.");
        for (const w of Object.values(backup.project.workspaces || {})) {
          const id = uid();
          workspaceMap.set(w.id, id);
          queue(team.id, "workspaces", id, {
            id,
            name: w.name,
            description: String(w.description || "").slice(0, 200),
            createdAt: now,
            createdBy: user.id,
          });
        }
        for (const key of ["tasks", "events", "topics", "folders", "files"])
          for (const item of Object.values(backup.project[key] || {})) {
            const id = uid();
            const base = {
              id,
              workspaceId: workspaceMap.get(item.workspaceId) || workspaceId,
              createdAt: now,
              createdBy: user.id,
            };
            let record;
            if (key === "tasks")
              record = {
                ...base,
                title: item.title,
                status: item.status,
                priority: item.priority,
                due: item.due,
                assignee: team.members?.[item.assignee]
                  ? item.assignee
                  : user.id,
              };
            if (key === "events")
              record = {
                ...base,
                title: item.title,
                date: item.date,
                time: item.time,
                description: String(item.description || "").slice(0, 500),
              };
            if (key === "topics") {
              record = {
                ...base,
                title: item.title,
                body: item.body,
                name: user.name,
              };
              const replies = {};
              for (const old of Object.values(item.replies || {})) {
                const replyId = uid();
                replies[replyId] = {
                  id: replyId,
                  text: old.text,
                  name: user.name,
                  createdBy: user.id,
                  createdAt: now,
                };
              }
              if (Object.keys(replies).length) record.replies = replies;
            }
            if (key === "folders") {
              folderMap.set("team_" + item.id, id);
              record = { ...base, name: item.name };
            }
            if (key === "files")
              record = {
                ...base,
                name: item.name,
                url: item.url,
                kind: item.kind,
                size: item.size,
                folderId: folderMap.get("team_" + item.folderId) || "",
              };
            queue(team.id, key, id, record);
          }
      }
      if (!operations.length)
        throw new Error("This backup does not contain records to import.");
      await model.importBatch(operations);
    }, "Backup imported as new records. Existing records were kept.");
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
  const activeTopic =
    dialog?.type === "discussion" ? team?.topics?.[dialog.item.id] : null;
  return (
    <main className="module-main">
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
                Settings: "Appearance, notifications and backups.",
                Profile: demo
                  ? "Update your profile details."
                  : "Update your profile and password.",
              }[view]
            }
          </p>
        </div>
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
        <div className="module-context">
          {!(view === "Storage" && scope === "personal") && (
            <label>
              Team
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
            <label>
              Project
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
          <label className="module-search">
            Search
            <input
              aria-label="Search this section"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search…"
            />
          </label>
        </div>
      )}
      {model.loading && <p role="status">Loading your teams…</p>}
      {view === "Dashboard" && (
        <Dashboard
          teams={model.teams}
          library={model.library}
          user={user}
          notifications={notifications}
          preferences={preferences}
          onNavigate={onNavigate}
        />
      )}
      {view === "Teams" && (
        <>
          <div className="module-toolbar">
            <span>{Object.keys(model.teams).length} teams</span>
            <button className="primary" onClick={() => open("team")}>
              <Plus size={16} /> Create team
            </button>
          </div>
          {team ? (
            <section className="module-card">
              <h2>{team.name}</h2>
              <p>
                {Object.keys(team.members || {}).length} members ·{" "}
                {owner ? "You are the owner" : "Team member"}
              </p>
              <div className="member-list">
                {Object.values(team.members || {}).map((m) => (
                  <div key={m.id}>
                    <span>
                      {users[m.id]?.name || m.name}
                      {m.id === team.owner ? " (owner)" : ""}
                    </span>
                    {owner && m.id !== team.owner && (
                      <button
                        className="icon-button"
                        aria-label={"Remove " + m.name}
                        onClick={() => askRemove("members", m)}
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {owner && (
                <button className="secondary" onClick={() => open("member")}>
                  Add registered user
                </button>
              )}
            </section>
          ) : (
            <Empty title="No teams yet">
              Create a team, then add registered classmates.
            </Empty>
          )}
        </>
      )}
      {!team &&
        ["Tasks", "Calendar", "Discussions", "Workspaces"].includes(view) && (
          <Empty title="Select or create a team">
            Use the Teams section to start a project with your classmates.
          </Empty>
        )}
      {view === "Workspaces" && team && (
        <>
          <div className="module-toolbar">
            <span>{Object.keys(team.workspaces || {}).length} projects</span>
            <button className="primary" onClick={() => open("workspace")}>
              <Plus size={16} /> New project
            </button>
          </div>
          <div className="workspace-grid">
            {Object.values(team.workspaces || {})
              .filter((w) => match(w.name))
              .map((w) => (
                <article className="module-card" key={w.id}>
                  <h2>{w.name}</h2>
                  <p>{w.description || "Project"}</p>
                  <small>
                    {
                      Object.values(team.tasks || {}).filter(
                        (t) => t.workspaceId === w.id && t.status === "Done",
                      ).length
                    }{" "}
                    completed /{" "}
                    {
                      Object.values(team.tasks || {}).filter(
                        (t) => t.workspaceId === w.id,
                      ).length
                    }{" "}
                    tasks
                  </small>
                  <div className="record-actions">
                    <button
                      className="secondary"
                      onClick={() => {
                        setContext({ teamId: team.id, workspaceId: w.id });
                        onNavigate("Tasks");
                      }}
                    >
                      Open project
                    </button>
                    <button
                      className="icon-button"
                      aria-label={"Edit " + w.name}
                      onClick={() => open("workspace", w)}
                    >
                      <Edit2 size={16} />
                    </button>
                    {owner && (
                      <button
                        className="icon-button"
                        aria-label={"Delete " + w.name}
                        onClick={() => askRemove("workspaces", w)}
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </article>
              ))}
          </div>
        </>
      )}
      {view === "Tasks" && team && (
        <>
          <div className="module-toolbar">
            <select
              aria-label="Task filter"
              value={taskFilter}
              onChange={(e) => setTaskFilter(e.target.value)}
            >
              <option>All</option>
              <option>Assigned to me</option>
              <option>Overdue</option>
            </select>
            <div>
              <button
                className="secondary"
                onClick={() =>
                  download("flabbychat-tasks.csv", taskCsv(tasks), "text/csv")
                }
              >
                Export CSV
              </button>{" "}
              <button
                className="primary"
                disabled={!workspace}
                onClick={() => open("task")}
              >
                <Plus size={16} /> New task
              </button>
            </div>
          </div>
          <div className="task-board">
            {["To do", "In progress", "Done"].map((status) => (
              <section key={status}>
                <h2>
                  {status}{" "}
                  <small>
                    {tasks.filter((t) => t.status === status).length}
                  </small>
                </h2>
                {tasks
                  .filter(
                    (t) =>
                      t.status === status &&
                      match(t.title) &&
                      (taskFilter !== "Assigned to me" ||
                        t.assignee === user.id) &&
                      (taskFilter !== "Overdue" ||
                        (t.due < localDate() && t.status !== "Done")),
                  )
                  .map((t) => (
                    <article className="module-card task-record" key={t.id}>
                      <span className={"priority-tag " + t.priority}>
                        {t.priority}
                      </span>
                      <h3>{t.title}</h3>
                      <p>{users[t.assignee]?.name || "Unassigned"}</p>
                      <small
                        className={
                          t.due < localDate() && t.status !== "Done"
                            ? "overdue"
                            : ""
                        }
                      >
                        Due {t.due}
                      </small>
                      <div className="record-actions">
                        <select
                          aria-label={"Status for " + t.title}
                          value={t.status}
                          onChange={(e) =>
                            run(
                              () =>
                                model.write(team.id, "tasks", t.id, {
                                  ...t,
                                  status: e.target.value,
                                  updatedAt: Date.now(),
                                }),
                              "Task status updated.",
                              false,
                            )
                          }
                        >
                          {["To do", "In progress", "Done"].map((s) => (
                            <option key={s}>{s}</option>
                          ))}
                        </select>
                        <button
                          className="icon-button"
                          aria-label={"Edit task " + t.title}
                          onClick={() => open("task", t)}
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          className="icon-button"
                          aria-label={"Delete task " + t.title}
                          onClick={() => askRemove("tasks", t)}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </article>
                  ))}
              </section>
            ))}
          </div>
          {!tasks.length && (
            <Empty title="No tasks yet">
              Create a task and assign it to a team member.
            </Empty>
          )}
        </>
      )}
      {view === "Calendar" && team && (
        <>
          <div className="module-toolbar">
            <input
              type="month"
              aria-label="Calendar month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
            />
            <button
              className="primary"
              disabled={!workspace}
              onClick={() => open("event")}
            >
              <Plus size={16} /> New event
            </button>
          </div>
          <div className="calendar-grid">
            {Array.from(
              {
                length: new Date(
                  Number(month.slice(0, 4)),
                  Number(month.slice(5)),
                  0,
                ).getDate(),
              },
              (_, index) => {
                const date = month + "-" + String(index + 1).padStart(2, "0");
                return (
                  <button
                    key={date}
                    className={date === localDate() ? "today" : ""}
                    onClick={() => open("event", { date })}
                  >
                    <strong>{index + 1}</strong>
                    {events
                      .filter((e) => e.date === date)
                      .map((e) => (
                        <span key={e.id}>
                          {e.time} {e.title}
                        </span>
                      ))}
                  </button>
                );
              },
            )}
          </div>
          <p className="small-note">Times use your local time zone.</p>
          {events
            .filter((e) => e.date.startsWith(month) && match(e.title))
            .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
            .map((e) => (
              <article className="module-card list-record" key={e.id}>
                <div>
                  <h3>{e.title}</h3>
                  <p>
                    {e.date} · {e.time} · {e.description}
                  </p>
                </div>
                <button
                  className="icon-button"
                  aria-label={"Edit event " + e.title}
                  onClick={() => open("event", e)}
                >
                  <Edit2 size={16} />
                </button>
                <button
                  className="icon-button"
                  aria-label={"Delete event " + e.title}
                  onClick={() => askRemove("events", e)}
                >
                  <Trash2 size={16} />
                </button>
              </article>
            ))}
        </>
      )}
      {view === "Discussions" && team && (
        <>
          <div className="module-toolbar">
            <span>{topics.length} topics</span>
            <button
              className="primary"
              disabled={!workspace}
              onClick={() => open("topic")}
            >
              <Plus size={16} /> New post
            </button>
          </div>
          {topics
            .filter((t) => match(t.title + " " + t.body))
            .sort((a, b) => b.createdAt - a.createdAt)
            .map((t) => (
              <article className="module-card list-record" key={t.id}>
                <button
                  className="topic-open"
                  onClick={() => open("discussion", t)}
                >
                  <h3>{t.title}</h3>
                  <p>{t.body.slice(0, 150)}</p>
                  <small>
                    {t.name} · {new Date(t.createdAt).toLocaleString()} ·{" "}
                    {Object.keys(t.replies || {}).length} replies
                  </small>
                </button>
                {t.createdBy === user.id && (
                  <button
                    className="icon-button"
                    aria-label={"Delete discussion " + t.title}
                    onClick={() => askRemove("topics", t)}
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </article>
            ))}
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
              <button
                className="primary"
                disabled={busy}
                onClick={() => upload.current.click()}
              >
                <Upload size={16} />
                {busy ? "Working…" : "Upload file"}
              </button>
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
          {Object.values(library.files || {})
            .filter((f) => (!folder || f.folderId === folder) && match(f.name))
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
                  <select
                    aria-label={"Folder for " + f.name}
                    value={f.folderId || ""}
                    onChange={(e) =>
                      run(
                        () =>
                          model.write(
                            teamScope ? team.id : null,
                            "files",
                            f.id,
                            { ...f, folderId: e.target.value },
                          ),
                        "File moved.",
                        false,
                      )
                    }
                  >
                    <option value="">No folder</option>
                    {Object.values(library.folders || {}).map((folder) => (
                      <option key={folder.id} value={folder.id}>
                        {folder.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="file-actions">
                  <button
                    className="icon-button"
                    title="Preview file"
                    aria-label={"Open " + f.name}
                    onClick={() => onPreview(f)}
                  >
                    <Eye size={18} />
                  </button>
                  <button
                    className="icon-button"
                    aria-label={"Download " + f.name}
                    onClick={() => fileDownload(f)}
                  >
                    <Download size={17} />
                  </button>
                  <button
                    className="icon-button"
                    aria-label={"Share " + f.name + " in chat"}
                    onClick={() => onShare(f)}
                  >
                    <Share2 size={17} />
                  </button>
                  <button
                    className="icon-button"
                    aria-label={"Remove file " + f.name}
                    onClick={() =>
                      askRemove("files", f, teamScope ? team.id : null)
                    }
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
              </article>
            ))}
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
          onNotice={onNotice}
        />
      )}
      {view === "Settings" && (
        <SettingsPanel
          preferences={preferences}
          onSetting={onSetting}
          run={run}
          team={team}
          teams={model.teams}
          library={model.library}
          context={context}
          setContext={setContext}
          onImport={selectImport}
          onNotice={onNotice}
        />
      )}
      {dialog && (
        <Dialog
          title={
            {
              team: "Create team",
              member: "Add team member",
              workspace: dialog.item ? "Edit project" : "New project",
              task: dialog.item ? "Edit task" : "New task",
              event: dialog.item?.id ? "Edit event" : "New event",
              topic: "New post",
              reply: "Reply to discussion",
              discussion: activeTopic?.title || "Discussion",
              folder: "New folder",
              delete: "Remove this item?",
              import: "Review backup import",
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
          {dialog.type === "delete" ? (
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
          ) : dialog.type === "import" ? (
            <>
              <p className="verification-copy">
                Personal files:{" "}
                {Object.keys(backup?.library?.files || {}).length}. Project
                records:{" "}
                {[
                  "tasks",
                  "events",
                  "topics",
                  "workspaces",
                  "files",
                  "folders",
                ].reduce(
                  (sum, key) =>
                    sum + Object.keys(backup?.project?.[key] || {}).length,
                  0,
                )}
                . New IDs will be created; existing data will not be replaced.
                Imported records become yours.
              </p>
              {backup?.project && !team && (
                <p className="error">
                  Select or create a team before importing project records.
                </p>
              )}
              <button
                className="primary"
                disabled={busy || Boolean(backup?.project && !team)}
                onClick={importRecords}
              >
                {busy ? "Importing…" : "Import as new records"}
              </button>
            </>
          ) : dialog.type === "discussion" ? (
            <>
              <p className="discussion-body">{activeTopic?.body}</p>
              <small>
                {activeTopic?.name} ·{" "}
                {new Date(
                  activeTopic?.createdAt || Date.now(),
                ).toLocaleString()}
              </small>
              {Object.values(activeTopic?.replies || {})
                .sort((a, b) => a.createdAt - b.createdAt)
                .map((r) => (
                  <article className="discussion-reply" key={r.id}>
                    <strong>{r.name}</strong>
                    <p>{r.text}</p>
                    <small>{new Date(r.createdAt).toLocaleString()}</small>
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
              <button
                className="primary"
                onClick={() => open("reply", activeTopic)}
              >
                Write a reply
              </button>
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
                    Assignee
                    <select
                      name="assignee"
                      defaultValue={dialog.item?.assignee || user.id}
                    >
                      {Object.values(team.members || {}).map((m) => (
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
function Dashboard({
  teams,
  library,
  user,
  notifications,
  preferences,
  onNavigate,
}) {
  const list = Object.values(teams),
    tasks = list.flatMap((t) => Object.values(t.tasks || {})),
    mine = tasks.filter((t) => t.assignee === user.id && t.status !== "Done"),
    events = list
      .flatMap((t) => Object.values(t.events || {}))
      .filter((e) => e.date >= localDate())
      .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  return (
    <>
      <div className="dashboard-stats">
        {[
          ["Teams", list.length],
          [
            "Workspaces",
            list.reduce(
              (sum, t) => sum + Object.keys(t.workspaces || {}).length,
              0,
            ),
          ],
          [
            "Tasks",
            tasks.filter((t) => t.status === "Done").length +
              " / " +
              tasks.length,
          ],
          ["Storage", Object.keys(library.files || {}).length],
          [
            "Notifications",
            notifications.filter((n) => !preferences.notificationRead?.[n.id])
              .length,
          ],
        ].map(([name, value]) => (
          <button
            className="module-card"
            key={name}
            onClick={() => onNavigate(name)}
          >
            <strong>{value}</strong>
            <span>
              {name === "Tasks"
                ? "Tasks completed"
                : name === "Storage"
                  ? "Personal files"
                  : name === "Workspaces"
                    ? "Projects"
                    : name === "Notifications"
                      ? "Notifications"
                      : name}
            </span>
          </button>
        ))}
      </div>
      <div className="dashboard-columns">
        <section className="module-card">
          <h2>Your upcoming tasks</h2>
          {mine.length ? (
            mine
              .sort((a, b) => a.due.localeCompare(b.due))
              .slice(0, 5)
              .map((t) => (
                <div className="dashboard-row" key={t.id}>
                  <strong>{t.title}</strong>
                  <small className={t.due < localDate() ? "overdue" : ""}>
                    Due {t.due} · {t.status}
                  </small>
                </div>
              ))
          ) : (
            <p>No unfinished tasks assigned to you.</p>
          )}
          <button className="secondary" onClick={() => onNavigate("Tasks")}>
            Open tasks
          </button>
        </section>
        <section className="module-card">
          <h2>Upcoming events</h2>
          {events.length ? (
            events.slice(0, 5).map((e) => (
              <div className="dashboard-row" key={e.id}>
                <strong>{e.title}</strong>
                <small>
                  {e.date} · {e.time}
                </small>
              </div>
            ))
          ) : (
            <p>No upcoming events.</p>
          )}
          <button className="secondary" onClick={() => onNavigate("Calendar")}>
            Open calendar
          </button>
        </section>
        <section className="module-card">
          <h2>Recent notifications</h2>
          {notifications.length ? (
            notifications.slice(0, 4).map((n) => (
              <div className="dashboard-row" key={n.id}>
                <strong>{n.title}</strong>
                <small>{n.detail}</small>
              </div>
            ))
          ) : (
            <p>You’re up to date.</p>
          )}
          <button
            className="secondary"
            onClick={() => onNavigate("Notifications")}
          >
            View notifications
          </button>
        </section>
        <section className="module-card">
          <h2>Quick access</h2>
          <div className="dashboard-shortcuts">
            {[
              {
                view: "Chat",
                title: "Chat",
                description: "Continue your conversations",
                Icon: MessageCircle,
              },
              {
                view: "Storage",
                title: "Files",
                description: "Find and share documents",
                Icon: FolderOpen,
              },
              {
                view: "Teams",
                title: "Teams",
                description: "Manage your project group",
                Icon: Users,
              },
            ].map(({ view, title, description, Icon }) => (
              <button key={view} onClick={() => onNavigate(view)}>
                <span className="shortcut-icon">
                  <Icon size={19} />
                </span>
                <span className="shortcut-copy">
                  <strong>{title}</strong>
                  <small>{description}</small>
                </span>
                <ArrowRight size={16} />
              </button>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
