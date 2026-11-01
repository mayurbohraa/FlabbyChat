import React, { useState } from "react";
import { Download, Edit2, Trash2 } from "lucide-react";
import { dateKey } from "../utils/calendar.js";
import { Dialog, Empty } from "./ui.jsx";
const today = () => dateKey(new Date());
export default function TaskBoard({
  tasks,
  users,
  user,
  filter,
  onFilter,
  onEdit,
  onRemove,
  onStatus,
  onExport,
  search,
}) {
  const [selected, setSelected] = useState(null);
  const task = tasks.find((t) => t.id === selected);
  const visible = tasks.filter(
    (t) =>
      t.title.toLowerCase().includes(search.toLowerCase()) &&
      (filter !== "Assigned to me" || t.assignee === user.id) &&
      (filter !== "Overdue" || (t.due < today() && t.status !== "Done")),
  );
  return (
    <>
      <div className="module-toolbar">
        <div className="filter-tabs" aria-label="Task filters">
          {["All", "Assigned to me", "Overdue"].map((name) => (
            <button
              key={name}
              aria-pressed={filter === name}
              onClick={() => onFilter(name)}
            >
              {name}
            </button>
          ))}
        </div>
        <div className="control-actions">
          <button className="secondary" onClick={onExport}>
            <Download size={16} />
            Export CSV
          </button>
        </div>
      </div>
      <div className="task-board compact-task-board">
        {["To do", "In progress", "Done"].map((status) => (
          <section
            key={status}
            className={
              "task-column " + status.toLowerCase().replaceAll(" ", "-")
            }
          >
            <h2>
              {status}
              <span>{visible.filter((t) => t.status === status).length}</span>
            </h2>
            {visible
              .filter((t) => t.status === status)
              .map((t) => (
                <button
                  key={t.id}
                  className="compact-task"
                  onClick={() => setSelected(t.id)}
                >
                  <span className={"priority-tag " + t.priority}>
                    {t.priority}
                  </span>
                  <strong>{t.title}</strong>
                  <span className="task-card-bottom">
                    <span>{users[t.assignee]?.name || "Team member"}</span>
                    <time
                      className={
                        t.due < today() && status !== "Done" ? "overdue" : ""
                      }
                    >
                      {t.due}
                    </time>
                  </span>
                </button>
              ))}
            {!visible.some((t) => t.status === status) && (
              <p className="column-empty">No tasks</p>
            )}
          </section>
        ))}
      </div>
      {!tasks.length && (
        <Empty title="No tasks yet">
          Create a task and assign it to a team member.
        </Empty>
      )}
      {task && (
        <Dialog
          title={task.title}
          className="task-detail-drawer"
          onClose={() => setSelected(null)}
        >
          <div className="drawer-meta">
            <span className={"priority-tag " + task.priority}>
              {task.priority} priority
            </span>
            <p>
              Assigned to{" "}
              <strong>{users[task.assignee]?.name || "Team member"}</strong>
            </p>
            <p>Due {task.due}</p>
          </div>
          <p className="task-description">
            {task.description || "No additional details."}
          </p>
          <label>
            Status
            <select
              aria-label={"Status for " + task.title}
              value={task.status}
              onChange={(e) => onStatus(task, e.target.value)}
            >
              {["To do", "In progress", "Done"].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <p className="small-note">
            Created {new Date(task.createdAt).toLocaleDateString()} · Last
            updated{" "}
            {new Date(task.updatedAt || task.createdAt).toLocaleDateString()}
          </p>
          <div className="control-actions">
            <button
              className="secondary"
              onClick={() => {
                setSelected(null);
                onEdit(task);
              }}
            >
              <Edit2 size={16} />
              Edit task
            </button>
            <button
              className="danger"
              onClick={() => {
                setSelected(null);
                onRemove(task);
              }}
            >
              <Trash2 size={16} />
              Delete task
            </button>
          </div>
        </Dialog>
      )}
    </>
  );
}
