import { formatTime } from "../utils/time.js";
import React, { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { dateKey, fromKey, periodDates, shiftDate } from "../utils/calendar.js";
import { Dialog } from "./ui.jsx";
import ActionMenu from "./ActionMenu.jsx";
const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export function MiniCalendar({
  value = dateKey(new Date()),
  events = [],
  onSelect,
}) {
  const date = fromKey(value),
    days = periodDates(value, "Month");
  return (
    <div className="mini-calendar">
      <strong>
        {date.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
      </strong>
      <div className="mini-days">
        {weekdays.map((d) => (
          <small key={d}>{d[0]}</small>
        ))}
        {Array.from({ length: fromKey(days[0]).getDay() }, (_, i) => (
          <span key={"blank" + i} />
        ))}
        {days.map((day) => (
          <button
            key={day}
            className={
              (day === dateKey(new Date()) ? "today " : "") +
              (events.some((e) => e.date === day) ? "has-events" : "")
            }
            aria-label={"View " + day}
            onClick={() => onSelect?.(day)}
          >
            {Number(day.slice(-2))}
          </button>
        ))}
      </div>
    </div>
  );
}
export default function CalendarPanel({
  events,
  onCreate,
  onEdit,
  onRemove,
  search,
  initialDate,
  onDateChange,
  canCreate = true,
  timeFormat,
}) {
  const [mode, setMode] = useState("Month"),
    [date, setDate] = useState(initialDate || dateKey(new Date())),
    [selected, setSelected] = useState(null);
  useEffect(() => {
    if (initialDate) setDate(initialDate);
  }, [initialDate]);
  useEffect(() => {
    onDateChange?.(date);
  }, [date, onDateChange]);
  const dates = periodDates(date, mode),
    year = date.slice(0, 4),
    visible = events
      .filter(
        (e) =>
          e.title.toLowerCase().includes(search.toLowerCase()) &&
          (mode === "Year" ? e.date.startsWith(year) : dates.includes(e.date)),
      )
      .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const title =
    mode === "Year"
      ? year
      : mode === "Day"
        ? fromKey(date).toLocaleDateString(undefined, {
            weekday: "long",
            month: "long",
            day: "numeric",
          })
        : mode === "Week"
          ? fromKey(dates[0]).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            }) +
            " – " +
            fromKey(dates[6]).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              year: "numeric",
            })
          : fromKey(date).toLocaleDateString(undefined, {
              month: "long",
              year: "numeric",
            });
  return (
    <>
      <div className="calendar-toolbar">
        <div className="control-actions">
          <button
            className="icon-button"
            aria-label="Previous period"
            onClick={() => setDate(shiftDate(date, mode, -1))}
          >
            <ChevronLeft size={18} />
          </button>
          <strong>{title}</strong>
          <button
            className="icon-button"
            aria-label="Next period"
            onClick={() => setDate(shiftDate(date, mode, 1))}
          >
            <ChevronRight size={18} />
          </button>
          <button
            className="secondary"
            onClick={() => setDate(dateKey(new Date()))}
          >
            Today
          </button>
        </div>
        <div className="control-actions">
          <div className="filter-tabs" aria-label="Calendar views">
            {["Day", "Week", "Month", "Year"].map((name) => (
              <button
                key={name}
                aria-pressed={mode === name}
                onClick={() => setMode(name)}
              >
                {name}
              </button>
            ))}
          </div>
        </div>
      </div>
      {mode === "Year" ? (
        <div className="year-calendar">
          {Array.from({ length: 12 }, (_, i) => (
            <MiniCalendar
              key={i}
              value={year + "-" + String(i + 1).padStart(2, "0") + "-01"}
              events={events}
              onSelect={(day) => {
                setDate(day);
                setMode("Month");
              }}
            />
          ))}
        </div>
      ) : mode === "Day" ? (
        <div className="day-agenda">
          {visible.length ? (
            visible.map((e) => (
              <button key={e.id} onClick={() => setSelected(e)}>
                <time>{formatTime(e.time, timeFormat)}</time>
                <span>
                  <strong>{e.title}</strong>
                  <small>{e.description || "Project event"}</small>
                </span>
              </button>
            ))
          ) : (
            <p>No events on this day.</p>
          )}
        </div>
      ) : (
        <div
          className={
            "schedule-grid " + (mode === "Week" ? "week-grid" : "month-grid")
          }
        >
          {weekdays.map((day) => (
            <div className="weekday" key={day}>
              {day}
            </div>
          ))}
          {mode === "Month" &&
            Array.from({ length: fromKey(dates[0]).getDay() }, (_, i) => (
              <div className="calendar-blank" key={"blank" + i} />
            ))}
          {dates.map((day) => (
            <div
              className={
                "schedule-day " + (day === dateKey(new Date()) ? "today" : "")
              }
              key={day}
            >
              <button
                className="day-number"
                disabled={!canCreate}
                aria-label={"Add event on " + day}
                onClick={() => onCreate({ date: day })}
              >
                {mode === "Week"
                  ? fromKey(day).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })
                  : Number(day.slice(-2))}
              </button>
              {visible
                .filter((e) => e.date === day)
                .slice(0, mode === "Week" ? 6 : 2)
                .map((e) => (
                  <button
                    className="calendar-event"
                    aria-label={
                      e.title + " at " + formatTime(e.time, timeFormat)
                    }
                    key={e.id}
                    title={formatTime(e.time, timeFormat) + " " + e.title}
                    onClick={() => setSelected(e)}
                  >
                    <i />
                    <span>
                      {formatTime(e.time, timeFormat)} {e.title}
                    </span>
                  </button>
                ))}
              {visible.filter((e) => e.date === day).length > 2 &&
                mode === "Month" && (
                  <button
                    className="calendar-more"
                    onClick={() => {
                      setDate(day);
                      setMode("Day");
                    }}
                  >
                    +{visible.filter((e) => e.date === day).length - 2} more
                  </button>
                )}
            </div>
          ))}
        </div>
      )}
      <div className="table-heading">
        <h2>Events</h2>
        <span>{visible.length} scheduled · local time</span>
      </div>
      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th>Event</th>
              <th>Date</th>
              <th>Time</th>
              <th>Description</th>
              <th>
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {visible.map((e) => (
              <tr key={e.id}>
                <td>
                  <button className="table-link" onClick={() => setSelected(e)}>
                    {e.title}
                  </button>
                </td>
                <td>{e.date}</td>
                <td>{formatTime(e.time, timeFormat)}</td>
                <td>{e.description || "—"}</td>
                <td>
                  <ActionMenu
                    label={"Event options for " + e.title}
                    actions={[
                      { label: "View details", onSelect: () => setSelected(e) },
                      { label: "Edit event", onSelect: () => onEdit(e) },
                      {
                        label: "Delete event",
                        danger: true,
                        onSelect: () => onRemove(e),
                      },
                    ]}
                  />
                </td>
              </tr>
            ))}
            {!visible.length && (
              <tr>
                <td colSpan="5" className="table-empty">
                  No events in this period.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {selected && (
        <Dialog title={selected.title} onClose={() => setSelected(null)}>
          <p className="event-summary-time">
            {selected.date} · {formatTime(selected.time, timeFormat)}
          </p>
          <p className="event-summary-description">
            {selected.description || "No additional details."}
          </p>
          <div className="dialog-actions">
            <button
              className="secondary"
              onClick={() => {
                setSelected(null);
                onEdit(selected);
              }}
            >
              Edit event
            </button>
            <button className="primary" onClick={() => setSelected(null)}>
              Done
            </button>
          </div>
        </Dialog>
      )}
    </>
  );
}
