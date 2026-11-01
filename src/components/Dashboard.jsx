import { formatTime } from "../utils/time.js";
import Avatar from "./Avatar.jsx";
import React, { useState } from "react";
import { MiniCalendar } from "./CalendarPanel.jsx";
import { dateKey } from "../utils/calendar.js";

export default function Dashboard({
  timeFormat,
  teams,
  library,
  user,
  users,
  onNavigate,
  onTeam,
  onCalendar,
}) {
  const list = Object.values(teams),
    [selected, setSelected] = useState("");
  const team = teams[selected] || list[0];
  const tasks = list.flatMap((t) => Object.values(t.tasks || {})),
    events = list
      .flatMap((t) => Object.values(t.events || {}))
      .filter((e) => e.date >= dateKey(new Date()))
      .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const mine = tasks
    .filter((t) => t.assignee === user.id && t.status !== "Done")
    .sort((a, b) => a.due.localeCompare(b.due));
  // Both charts summarize the tasks in the teams this account can access.
  const counts = ["To do", "In progress", "Done"].map((status) => ({
    status,
    count: tasks.filter((t) => t.status === status).length,
  }));
  const completed = tasks.length
    ? Math.round((counts[2].count / tasks.length) * 100)
    : 0;
  let offset = 0;
  const segments = counts.map((item) => {
    const size = tasks.length ? (item.count / tasks.length) * 100 : 0;
    const segment = { ...item, size, start: offset };
    offset += size;
    return segment;
  });
  const workload = list
    .map((item) => {
      const records = Object.values(item.tasks || {});
      return {
        id: item.id,
        name: item.name,
        total: records.length,
        done: records.filter((t) => t.status === "Done").length,
      };
    })
    .sort((a, b) => b.total - a.total);
  const largestTeam = Math.max(1, ...workload.map((item) => item.total));
  return (
    <>
      <div className="overview-strip">
        {[
          { label: "My open tasks", count: mine.length, target: "Tasks" },
          {
            label: "Due today",
            count: mine.filter((t) => t.due === dateKey(new Date())).length,
            target: "Tasks",
          },
          {
            label: "Projects",
            count: list.reduce(
              (n, t) => n + Object.keys(t.workspaces || {}).length,
              0,
            ),
            target: "Workspaces",
          },
          {
            label: "My files",
            count: Object.keys(library.files || {}).length,
            target: "Storage",
          },
        ].map((item) => (
          <button key={item.label} onClick={() => onNavigate(item.target)}>
            <span>{item.label}</span>
            <strong>{item.count}</strong>
          </button>
        ))}
      </div>
      <div className="dashboard-layout">
        <div className="dashboard-primary">
          <section className="dashboard-section">
            <div className="section-heading">
              <h2>Project progress</h2>
              <span>
                {tasks.length} {tasks.length === 1 ? "task" : "tasks"} ·{" "}
                {list.length} {list.length === 1 ? "team" : "teams"}
              </span>
            </div>
            {tasks.length ? (
              <div className="dashboard-charts">
                <div className="task-progress-visual">
                  <svg
                    className="task-donut"
                    viewBox="0 0 160 160"
                    role="img"
                    aria-label={counts
                      .map((c) => c.status + ": " + c.count)
                      .join(", ")}
                  >
                    <circle
                      className="donut-track"
                      cx="80"
                      cy="80"
                      r="54"
                      fill="none"
                      strokeWidth="14"
                    />
                    <g transform="rotate(-90 80 80)">
                      {segments
                        .filter((item) => item.count)
                        .map((item) => (
                          <circle
                            key={item.status}
                            className={item.status
                              .toLowerCase()
                              .replaceAll(" ", "-")}
                            cx="80"
                            cy="80"
                            r="54"
                            fill="none"
                            strokeWidth="14"
                            pathLength="100"
                            strokeDasharray={`${item.size} ${100 - item.size}`}
                            strokeDashoffset={-item.start}
                          />
                        ))}
                    </g>
                    <text x="80" y="79" className="donut-value">
                      {completed}%
                    </text>
                    <text x="80" y="99" className="donut-caption">
                      complete
                    </text>
                  </svg>
                  <div className="progress-legend">
                    {counts.map((c) => (
                      <span key={c.status}>
                        <i
                          className={c.status
                            .toLowerCase()
                            .replaceAll(" ", "-")}
                        />
                        {c.status}
                        <strong>{c.count}</strong>
                      </span>
                    ))}
                  </div>
                </div>
                <div className="team-workload">
                  <h3>Tasks by team</h3>
                  <p className="chart-caption">
                    Completed tasks are shown in green.
                  </p>
                  {workload.slice(0, 5).map((item) => (
                    <button
                      className="workload-row"
                      aria-label={"Open " + item.name + " team"}
                      key={item.id}
                      onClick={() => onTeam(item.id)}
                    >
                      <span className="workload-label">
                        <span>{item.name}</span>
                        <strong>
                          {item.done} / {item.total}
                        </strong>
                      </span>
                      <span
                        className="workload-track"
                        role="img"
                        aria-label={`${item.name}: ${item.done} completed of ${item.total} tasks`}
                      >
                        <span
                          className="workload-total"
                          style={{
                            width: (item.total / largestTeam) * 100 + "%",
                          }}
                        >
                          <span
                            className="workload-done"
                            style={{
                              width:
                                (item.total
                                  ? (item.done / item.total) * 100
                                  : 0) + "%",
                            }}
                          />
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <p className="quiet-empty">
                Create a task to start tracking progress.
              </p>
            )}
          </section>
          <div className="dashboard-agenda-grid">
            <section className="dashboard-section">
              <div className="section-heading">
                <h2>Your upcoming tasks</h2>
                <button
                  className="text-button"
                  onClick={() => onNavigate("Tasks")}
                >
                  View tasks
                </button>
              </div>
              {mine.length ? (
                mine.slice(0, 5).map((t) => (
                  <div className="agenda-row" key={t.id}>
                    <div>
                      <strong>{t.title}</strong>
                      <small>{users[t.assignee]?.name || user.name}</small>
                    </div>
                    <time
                      className={t.due < dateKey(new Date()) ? "overdue" : ""}
                    >
                      {t.due}
                    </time>
                  </div>
                ))
              ) : (
                <p className="quiet-empty">
                  No unfinished tasks assigned to you.
                </p>
              )}
            </section>
            <section className="dashboard-section">
              <div className="section-heading">
                <h2>Upcoming events</h2>
                <button
                  className="text-button"
                  onClick={() => onNavigate("Calendar")}
                >
                  View calendar
                </button>
              </div>
              {events.length ? (
                events.slice(0, 4).map((e) => (
                  <div className="agenda-row" key={e.id}>
                    <span className="event-date-tile">
                      {Number(e.date.slice(-2))}
                      <small>
                        {new Date(e.date + "T12:00:00").toLocaleDateString(
                          undefined,
                          { month: "short" },
                        )}
                      </small>
                    </span>
                    <div>
                      <strong>{e.title}</strong>
                      <small>{e.description || "Project event"}</small>
                    </div>
                    <time>{formatTime(e.time, timeFormat)}</time>
                  </div>
                ))
              ) : (
                <p className="quiet-empty">No upcoming events.</p>
              )}
            </section>
          </div>
        </div>
        <aside className="dashboard-aside">
          <section className="dashboard-section">
            <MiniCalendar events={events} onSelect={onCalendar} />
          </section>
          <section className="dashboard-section">
            <div className="section-heading">
              <h2>Your team</h2>
              {team && (
                <button className="text-button" onClick={() => onTeam(team.id)}>
                  Open
                </button>
              )}
            </div>
            {list.length > 1 && (
              <select
                aria-label="Dashboard team"
                value={team.id}
                onChange={(e) => setSelected(e.target.value)}
              >
                {list.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            )}
            {team ? (
              <>
                <p className="team-summary-name">{team.name}</p>
                {Object.values(team.members || {})
                  .slice(0, 6)
                  .map((m) => (
                    <div className="team-person" key={m.id}>
                      <Avatar
                        className="person-initials"
                        name={users[m.id]?.name || m.name}
                        photoURL={users[m.id]?.photoURL}
                      />
                      <div>
                        <strong>{users[m.id]?.name || m.name}</strong>
                        <small>
                          {m.id === team.owner
                            ? "Owner"
                            : m.status === "on hold"
                              ? "Access paused"
                              : "Member"}
                        </small>
                      </div>
                    </div>
                  ))}
              </>
            ) : (
              <>
                <p className="quiet-empty">
                  Create a team to work with your classmates.
                </p>
                <button
                  className="secondary"
                  onClick={() => onNavigate("Teams")}
                >
                  Open teams
                </button>
              </>
            )}
          </section>
        </aside>
      </div>
    </>
  );
}
