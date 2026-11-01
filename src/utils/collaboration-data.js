import { callSummary, dateKey } from "./calendar.js";
import { formatTime } from "./time.js";
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
export function notificationItems(
  messages,
  teams,
  userId,
  lastRead = {},
  timeFormat,
) {
  const items = [];
  for (const [chat, list] of Object.entries(messages || {}))
    for (const m of Object.values(list || {})) {
      if (m.kind === "call") {
        if (m.call?.receiver === userId && m.call.outcome !== "ringing")
          items.push({
            id: "call_" + m.id,
            title:
              m.call.outcome === "missed"
                ? "Missed call"
                : m.call.video
                  ? "Video call"
                  : "Voice call",
            detail: m.name + " · " + callSummary(m.call).split(" · ").at(-1),
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
  const today = dateKey(new Date());
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
          detail:
            event.title +
            " · " +
            event.date +
            " " +
            formatTime(event.time, timeFormat),
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
