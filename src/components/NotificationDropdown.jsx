import React, { useState } from "react";
import { X, Bell, CheckCheck } from "lucide-react";
import { friendlyError } from "../utils/chat-data.js";
export default function NotificationDropdown({
  notifications,
  preferences,
  onRead,
  onOpen,
  onClose,
}) {
  const [notificationError, setNotificationError] = useState("");
  const [notificationBusy, setNotificationBusy] = useState(false);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const notificationCount = notifications.filter(
    (n) => !preferences.notificationRead?.[n.id],
  ).length;
  return (
    <section
      id="notification-panel"
      className="notification-panel"
      role="region"
      aria-label="Notifications"
    >
      <header>
        <div>
          <h2>Notifications</h2>
          <small>{notificationCount} unread</small>
        </div>
        <button
          className="icon-button"
          aria-label="Close notifications"
          onClick={() => onClose()}
        >
          <X size={18} />
        </button>
      </header>
      <div className="notification-tools">
        <div className="notification-filters" aria-label="Filter notifications">
          <button
            aria-pressed={!unreadOnly}
            onClick={() => setUnreadOnly(false)}
          >
            All
          </button>
          <button aria-pressed={unreadOnly} onClick={() => setUnreadOnly(true)}>
            Unread
          </button>
        </div>
        <button
          className="text-button"
          disabled={!notificationCount || notificationBusy}
          onClick={async () => {
            setNotificationBusy(true);
            setNotificationError("");
            try {
              await Promise.all(
                notifications
                  .filter((n) => !preferences.notificationRead?.[n.id])
                  .map((n) => onRead(n.id)),
              );
            } catch (err) {
              setNotificationError(friendlyError(err));
            } finally {
              setNotificationBusy(false);
            }
          }}
        >
          <CheckCheck size={15} aria-hidden="true" />
          Mark all read
        </button>
      </div>
      {notificationError && (
        <p className="error" role="alert">
          {notificationError}
        </p>
      )}
      <div className="notification-list">
        {notifications
          .filter((n) => !unreadOnly || !preferences.notificationRead?.[n.id])
          .map((n) => (
            <button
              key={n.id}
              className={
                "notification-item " +
                (!preferences.notificationRead?.[n.id] ? "is-unread" : "")
              }
              disabled={notificationBusy}
              onClick={async () => {
                setNotificationBusy(true);
                setNotificationError("");
                try {
                  await onRead(n.id);
                  onOpen(n);
                } catch (err) {
                  setNotificationError(friendlyError(err));
                } finally {
                  setNotificationBusy(false);
                }
              }}
            >
              <span className="notification-icon" aria-hidden="true">
                <Bell size={17} />
              </span>
              <span className="notification-content">
                <strong>{n.title}</strong>
                <span>{n.detail}</span>
                <time dateTime={new Date(n.createdAt).toISOString()}>
                  {new Date(n.createdAt).toLocaleString([], {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                    hour12: preferences.settings?.timeFormat !== "24",
                  })}
                </time>
              </span>
              {!preferences.notificationRead?.[n.id] && (
                <i className="notification-unread-dot" aria-label="Unread" />
              )}
            </button>
          ))}
        {!notifications.filter(
          (n) => !unreadOnly || !preferences.notificationRead?.[n.id],
        ).length && (
          <p className="notification-empty">
            <Bell size={24} aria-hidden="true" />
            {unreadOnly ? "You're all caught up." : "No notifications yet."}
            <small>Messages, calls and team updates appear here.</small>
          </p>
        )}
      </div>
    </section>
  );
}
