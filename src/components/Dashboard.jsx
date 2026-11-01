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
  const counts = ["To do", "In progress", "Done"].map((status) => ({
    status,
    count: tasks.filter((t) => t.status === status).length,
  }));
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
                {tasks.length
                  ? Math.round((counts[2].count / tasks.length) * 100)
                  : 0}
                % complete
              </span>
            </div>
            {tasks.length ? (
              <>
                <div
                  className="progress-chart"
                  role="img"
                  aria-label={counts
                    .map((c) => c.status + ": " + c.count)
                    .join(", ")}
                >
                  {counts
                    .filter((c) => c.count)
                    .map((c) => (
                      <span
                        key={c.status}
                        className={c.status.toLowerCase().replaceAll(" ", "-")}
                        style={{ width: (c.count / tasks.length) * 100 + "%" }}
                      />
                    ))}
                </div>
                <div className="progress-legend">
                  {counts.map((c) => (
                    <span key={c.status}>
                      <i
                        className={c.status.toLowerCase().replaceAll(" ", "-")}
                      />
                      {c.status}
                      <strong>{c.count}</strong>
                    </span>
                  ))}
                </div>
              </>
            ) : (
              <p className="quiet-empty">
                Create a task to start tracking progress.
              </p>
            )}
          </section>
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
                  <span
                    className={
                      "status-dot " +
                      t.status.toLowerCase().replaceAll(" ", "-")
                    }
                  />
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
