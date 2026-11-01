import { safeAttachmentUrl } from "../services/storage.js";
export const collections = [
  "workspaces",
  "tasks",
  "events",
  "topics",
  "files",
  "folders",
];
export function download(name, text, type = "application/json") {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function taskCsv(tasks) {
  const quote = (value) =>
    '"' +
    String(value ?? "")
      .replace(/"/g, '""')
      .replace(/^[=+@\t\r\n-]/, "'$&") +
    '"';
  return [
    ["Title", "Status", "Assignee", "Deadline", "Priority"],
    ...tasks.map((t) => [t.title, t.status, t.assignee, t.due, t.priority]),
  ]
    .map((row) => row.map(quote).join(","))
    .join("\r\n");
}
export function makeBackup(library, team, workspace) {
  const data = { library };
  if (team) {
    data.project = {
      name: team.name,
      sourceWorkspace: workspace || "",
      ...Object.fromEntries(
        collections.map((key) => [
          key,
          Object.fromEntries(
            Object.entries(team[key] || {}).filter(
              ([, item]) =>
                !workspace ||
                (key === "workspaces" && item.id === workspace) ||
                item.workspaceId === workspace,
            ),
          ),
        ]),
      ),
    };
  }
  return {
    format: "flabbychat-backup",
    version: 1,
    exportedAt: new Date().toISOString(),
    ...data,
  };
}
export function validateBackup(text) {
  if (text.length > 8 * 1024 * 1024)
    throw new Error("Choose a backup smaller than 8 MB.");
  let backup;
  try {
    backup = JSON.parse(text);
  } catch {
    throw new Error("This file is not valid JSON.");
  }
  if (backup.format !== "flabbychat-backup" || backup.version !== 1)
    throw new Error("Choose a FlabbyChat version 1 backup.");
  const checkMap = (value, key) => {
    if (value === undefined) return;
    if (!value || Array.isArray(value) || typeof value !== "object")
      throw new Error("Invalid " + key + " list.");
    if (Object.keys(value).length > 1000)
      throw new Error(
        "A backup can contain at most 1,000 " + key + " records.",
      );
    for (const [id, item] of Object.entries(value)) {
      if (
        !/^[a-zA-Z0-9_-]{1,100}$/.test(id) ||
        !item ||
        typeof item !== "object" ||
        item.id !== id
      )
        throw new Error("Invalid " + key + " record.");
      if (
        key === "files" &&
        (!safeAttachmentUrl(item.url) ||
          !["image", "pdf"].includes(item.kind) ||
          typeof item.name !== "string" ||
          item.name.length > 300 ||
          !(item.size >= 0 && item.size <= 5242880))
      )
        throw new Error("A file contains an invalid URL, type, name or size.");
      if (
        ["tasks", "events", "topics"].includes(key) &&
        (typeof item.title !== "string" ||
          !item.title.trim() ||
          item.title.length > 160)
      )
        throw new Error("A " + key + " title is missing or too long.");
      if (
        ["workspaces", "folders"].includes(key) &&
        (typeof item.name !== "string" ||
          !item.name.trim() ||
          item.name.length > 80)
      )
        throw new Error("A " + key + " name is invalid.");
      if (
        key === "tasks" &&
        (!["To do", "In progress", "Done"].includes(item.status) ||
          !/^\d{4}-\d{2}-\d{2}$/.test(item.due) ||
          !["Low", "Medium", "High"].includes(item.priority))
      )
        throw new Error("A task has an invalid status, priority or deadline.");
      if (
        key === "events" &&
        (!/^\d{4}-\d{2}-\d{2}$/.test(item.date) ||
          !/^\d{2}:\d{2}$/.test(item.time))
      )
        throw new Error("An event has an invalid date or time.");
      if (key === "topics") {
        if (typeof item.body !== "string" || item.body.length > 5000)
          throw new Error("A discussion has an invalid body.");
        if (Object.keys(item.replies || {}).length > 1000)
          throw new Error("A discussion has too many replies.");
        for (const reply of Object.values(item.replies || {}))
          if (
            !reply ||
            typeof reply.text !== "string" ||
            reply.text.length > 3000
          )
            throw new Error("A discussion reply is invalid.");
      }
    }
  };
  if (backup.library) {
    checkMap(backup.library.files, "files");
    checkMap(backup.library.folders, "folders");
  }
  if (backup.project)
    collections.forEach((key) => checkMap(backup.project[key], key));
  return backup;
}
export function notificationItems(messages, teams, userId, lastRead = {}) {
  const items = [];
  for (const [chat, list] of Object.entries(messages || {}))
    for (const m of Object.values(list || {})) {
      if (m.kind === "call") {
        if (m.call?.receiver === userId && m.call.outcome !== "ringing")
          items.push({
            id: "call_" + m.id,
            title: (m.call.video ? "Video" : "Voice") + " call from " + m.name,
            detail: m.call.outcome,
            createdAt: m.call.endedAt || m.createdAt,
            chat,
            recipient: m.call.caller,
          });
      } else if (m.userId !== userId && m.createdAt > (lastRead[chat] || 0))
        items.push({
          id: "message_" + m.id,
          title: m.name,
          detail: m.text || m.attachment?.name || "Shared a file",
          createdAt: m.createdAt,
          chat,
          recipient: m.recipient ? m.userId : undefined,
        });
    }
  const today = new Date().toLocaleDateString("en-CA");
  for (const team of Object.values(teams || {})) {
    const context = { teamId: team.id };
    if (team.owner !== userId)
      items.push({
        id: "team_" + team.id,
        title: "Added to team",
        detail: team.name,
        createdAt: team.members?.[userId]?.joinedAt || team.createdAt,
        ...context,
        target: "Teams",
      });
    for (const task of Object.values(team.tasks || {}))
      if (task.assignee === userId && task.status !== "Done")
        items.push({
          id: "task_" + task.id,
          title: "Task assigned to you",
          detail: task.title + " · Due " + task.due,
          createdAt: task.createdAt,
          ...context,
          workspaceId: task.workspaceId,
          target: "Tasks",
        });
    for (const event of Object.values(team.events || {}))
      if (event.date >= today)
        items.push({
          id: "event_" + event.id,
          title: "Upcoming event",
          detail: event.title + " · " + event.date + " " + event.time,
          createdAt: event.createdAt,
          ...context,
          workspaceId: event.workspaceId,
          target: "Calendar",
        });
    for (const topic of Object.values(team.topics || {})) {
      if (topic.createdBy !== userId)
        items.push({
          id: "topic_" + topic.id,
          title: "New discussion",
          detail: topic.title,
          createdAt: topic.createdAt,
          ...context,
          workspaceId: topic.workspaceId,
          target: "Discussions",
        });
      for (const reply of Object.values(topic.replies || {}))
        if (reply.createdBy !== userId)
          items.push({
            id: "reply_" + reply.id,
            title: "Reply from " + reply.name,
            detail: topic.title + ": " + reply.text.slice(0, 100),
            createdAt: reply.createdAt,
            ...context,
            workspaceId: topic.workspaceId,
            target: "Discussions",
          });
    }
  }
  return items.sort((a, b) => b.createdAt - a.createdAt);
}
