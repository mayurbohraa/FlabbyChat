import React, { useEffect, useRef, useState } from "react";
import {
  MessageCircle,
  Hash,
  Plus,
  Search,
  Star,
  LogOut,
  Send,
  Paperclip,
  FileText,
  Phone,
  Video,
  Menu,
  X,
  Trash2,
  Download,
  Bell,
  Settings,
  LayoutDashboard,
  Users,
  LayoutGrid,
  CheckSquare,
  CalendarDays,
  MessagesSquare,
  FolderOpen,
  CircleCheck,
} from "lucide-react";
import * as cloud from "../services/cloud.js";
import {
  createCall,
  watchIncoming,
  dismissIncoming,
} from "../services/calls.js";
import CallDialog from "./CallDialog.jsx";
import FilePreview from "./FilePreview.jsx";
import Collaboration from "./Collaboration.jsx";
import NotificationDropdown from "./NotificationDropdown.jsx";
import useCollaboration from "../hooks/useCollaboration.js";
import { notificationItems, download } from "../utils/collaboration-data.js";
import { applyTheme, savedTheme } from "../utils/theme.js";
import { Dialog, useMedia } from "./ui.jsx";
import logo from "../assets/images/FlabbyChatLogo.png";
import {
  prepareAttachment,
  storageConfigured,
  safeAttachmentUrl,
} from "../services/storage.js";
import {
  uid,
  general,
  loadDemo,
  saveDemo,
  sampleChat,
  filterMessages,
  unreadCount,
  conversationId,
  friendlyError,
  demoStorageKey,
} from "../utils/chat-data.js";
function Avatar({ name, photoURL }) {
  if (safeAttachmentUrl(photoURL))
    return (
      <img className="avatar" src={safeAttachmentUrl(photoURL)} alt={name} />
    );
  return (
    <span className="avatar" aria-hidden="true">
      {(name || "?")
        .split(" ")
        .map((part) => part[0])
        .slice(0, 2)
        .join("")}
    </span>
  );
}
function ChannelDialog({ onClose, onCreate }) {
  const dialog = useRef();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const element = dialog.current;
    element.showModal();
    return () => element.close();
  }, []);
  async function submit(e) {
    e.preventDefault();
    const fields = Object.fromEntries(new FormData(e.currentTarget));
    const name = fields.name.trim().toLowerCase().replace(/\s+/g, "-");
    if (!/^[a-z0-9-]+$/.test(name)) {
      setError("Use letters, numbers and dashes in the channel name.");
      return;
    }
    setBusy(true);
    try {
      await onCreate({
        id: uid(),
        name,
        description: fields.description.trim(),
      });
      onClose();
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <dialog
      ref={dialog}
      className="form-dialog"
      aria-labelledby="new-channel-title"
      onCancel={onClose}
    >
      <div className="dialog-heading">
        <h2 id="new-channel-title">Create channel</h2>
        <button className="icon-button" aria-label="Close" onClick={onClose}>
          <X size={20} />
        </button>
      </div>
      <form onSubmit={submit}>
        <label>
          Channel name
          <input
            name="name"
            required
            maxLength={40}
            placeholder="e.g. project-discussion"
            autoFocus
          />
        </label>
        <label>
          Description
          <textarea
            name="description"
            maxLength={200}
            required
            placeholder="What is this channel for?"
          />
        </label>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <div className="dialog-actions">
          <button type="button" className="secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="primary" disabled={busy}>
            {busy ? "Creating…" : "Create channel"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
export default function Chat({ user, demo, onLogout, initialError = "" }) {
  const mobileLayout = useMedia("(max-width:700px)"),
    chatDrawer = useMedia("(max-width:1050px)");
  const [data, setData] = useState(() => {
    try {
      return demo
        ? loadDemo()
        : { channels: { general }, users: {}, presence: {} };
    } catch {
      return sampleChat();
    }
  });
  const [preferences, setPreferences] = useState(() =>
    demo ? data.preferences || {} : {},
  );
  const [selected, setSelected] = useState({ id: "general", private: false });
  const [messages, setMessages] = useState({});
  const [allMessages, setAllMessages] = useState({});
  const [query, setQuery] = useState("");
  const [text, setText] = useState("");
  const [attachment, setAttachment] = useState(null);
  const [error, setError] = useState(initialError);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(!demo);
  const [mobile, setMobile] = useState(false);
  const [channelDialog, setChannelDialog] = useState(false);
  const [call, setCall] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const headerRef = useRef(null);
  const searchInputRef = useRef(null);
  const [globalSearch, setGlobalSearch] = useState("");
  const [previewFile, setPreviewFile] = useState(null);
  const [chatListOpen, setChatListOpen] = useState(false);
  const [view, setView] = useState("Dashboard"),
    [notice, setNotice] = useState(""),
    [context, setContext] = useState({ teamId: "", workspaceId: "" }),
    [shareFile, setShareFile] = useState(null);
  const model = useCollaboration(user, demo);
  const settingsRef = useRef(preferences.settings || {});
  settingsRef.current = preferences.settings || {};
  const notified = useRef(new Set()),
    openedAt = useRef(Date.now());
  const drafts = useRef({});
  const bottom = useRef(),
    fileInput = useRef(),
    callRef = useRef(null),
    selectionRef = useRef(selected.id);
  const currentUser = { ...user, ...(data.users?.[user.id] || {}) };
  const notifications = notificationItems(
    allMessages,
    model.teams,
    user.id,
    preferences.lastRead,
  );
  const notificationCount = notifications.filter(
    (n) => !preferences.notificationRead?.[n.id],
  ).length;
  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus();
  }, [searchOpen]);
  useEffect(() => {
    if (!searchOpen && !notificationsOpen) return;
    function dismiss(e) {
      if (e.type === "keydown" && e.key !== "Escape") return;
      if (e.type !== "keydown" && headerRef.current?.contains(e.target)) return;
      setSearchOpen(false);
      setNotificationsOpen(false);
      setGlobalSearch("");
    }
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", dismiss);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", dismiss);
    };
  }, [searchOpen, notificationsOpen]);
  useEffect(() => {
    applyTheme(preferences.settings?.theme || savedTheme());
  }, [preferences.settings?.theme]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 6000);
    return () => clearTimeout(timer);
  }, [notice]);
  useEffect(() => {
    if (
      !preferences.settings?.browserNotifications ||
      !("Notification" in window) ||
      Notification.permission !== "granted" ||
      document.visibilityState !== "hidden"
    )
      return;
    for (const n of notifications) {
      if (n.createdAt < openedAt.current || notified.current.has(n.id))
        continue;
      notified.current.add(n.id);
      try {
        new Notification(n.title, { body: n.detail, tag: n.id });
      } catch {
        /* In-app notifications remain available. */
      }
    }
  }, [allMessages, model.teams, preferences.settings?.browserNotifications]);
  const channel = selected.private
    ? {
        id: selected.id,
        name: data.users?.[selected.recipient]?.name || selected.name,
        description: "Private conversation",
      }
    : data.channels?.[selected.id] || general;
  const other = selected.private
    ? data.users?.[selected.recipient] || {
        id: selected.recipient,
        name: selected.name,
      }
    : null;
  const displayMessages = filterMessages(messages, query);
  const userKeys = Object.keys(data.users || {})
    .sort()
    .join(",");
  const channelKeys = Object.keys(data.channels || {})
    .sort()
    .join(",");
  function report(err) {
    setError(friendlyError(err));
  }
  useEffect(() => {
    if (demo) return;
    const stopDirectory = cloud.watchDirectory(setData, report);
    const stopPreferences = cloud.watchPreferences(
      user.id,
      setPreferences,
      report,
    );
    const stopPresence = cloud.trackPresence(user.id);
    const stopIncoming = watchIncoming(
      user.id,
      (incoming) => {
        if (!incoming) return;
        if (Date.now() - incoming.createdAt > 60000 || callRef.current) {
          dismissIncoming(user.id, incoming).catch(report);
          return;
        }
        if (
          settingsRef.current.browserNotifications &&
          "Notification" in window &&
          Notification.permission === "granted"
        ) {
          try {
            new Notification(
              (incoming.video ? "Video" : "Voice") +
                " call from " +
                incoming.name,
              { tag: incoming.id },
            );
          } catch {}
        }
        const session = createCall({
          user: currentUser,
          other: { id: incoming.from, name: incoming.name },
          video: incoming.video,
          incoming,
        });
        callRef.current = session;
        setCall(session);
      },
      report,
    );
    return () => {
      stopDirectory();
      stopPreferences();
      stopPresence();
      stopIncoming();
      callRef.current?.end();
    };
  }, [demo, user.id]);
  useEffect(() => {
    if (!demo) return;
    try {
      loadDemo();
    } catch (err) {
      report(err);
    }
    const sync = (e) => {
      if (e.key === demoStorageKey) {
        try {
          const next = loadDemo();
          setData(next);
          setPreferences(next.preferences || {});
        } catch (err) {
          report(err);
        }
      }
    };
    const sameTab = () => sync({ key: demoStorageKey });
    window.addEventListener("storage", sync);
    window.addEventListener("flabbychat:demo", sameTab);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("flabbychat:demo", sameTab);
    };
  }, [demo]);
  useEffect(() => {
    selectionRef.current = selected.id;
    setQuery("");
    const draft = drafts.current[selected.id] || {};
    setText(draft.text || "");
    setAttachment(draft.attachment || null);
    setMessages({});
    if (demo) return;
    setLoading(true);
    return cloud.watchMessages(
      selected.id,
      user.id,
      selected.recipient,
      (value) => {
        if (selectionRef.current !== selected.id) return;
        setMessages(value);
        setLoading(false);
      },
      (err) => {
        if (selectionRef.current !== selected.id) return;
        setMessages({});
        setLoading(false);
        report(err);
      },
    );
  }, [selected.id, user.id, demo]);
  useEffect(() => {
    if (!demo) return;
    setMessages(
      Object.fromEntries(
        Object.entries(data.messages || {}).filter(
          ([, message]) => message.channel === selected.id,
        ),
      ),
    );
    setAllMessages(
      Object.fromEntries(
        [
          ...Object.keys(data.channels || {}),
          ...Object.keys(data.users || {})
            .filter((id) => id !== user.id)
            .map((id) => conversationId(id, user.id)),
        ].map((id) => [
          id,
          Object.fromEntries(
            Object.entries(data.messages || {}).filter(
              ([, message]) => message.channel === id,
            ),
          ),
        ]),
      ),
    );
  }, [data, selected.id, demo, user.id]);
  useEffect(() => {
    if (demo) return;
    return cloud.watchUnread(
      data.channels || {},
      data.users || {},
      user.id,
      setAllMessages,
      report,
    );
  }, [demo, user.id, userKeys, channelKeys]);
  const newest = Object.values(messages).reduce(
    (max, m) => Math.max(max, m.createdAt),
    0,
  );
  useEffect(() => {
    if (!newest || view !== "Chat" || document.visibilityState === "hidden")
      return;
    const timestamp = Math.max(Date.now(), newest);
    if (demo) {
      try {
        const next = loadDemo();
        next.preferences = {
          ...next.preferences,
          lastRead: { ...next.preferences?.lastRead, [selected.id]: timestamp },
        };
        saveDemo(next);
        setPreferences(next.preferences);
      } catch (err) {
        report(err);
      }
    } else cloud.markRead(user.id, selected.id, timestamp).catch(report);
  }, [selected.id, newest, demo, user.id, view]);
  useEffect(() => {
    bottom.current?.scrollIntoView?.({ behavior: "smooth" });
  }, [selected.id, newest]);
  async function updateDemo(mutator) {
    const next = loadDemo();
    mutator(next);
    saveDemo(next);
    setData(next);
    setPreferences(next.preferences || {});
  }
  function select(next) {
    setGlobalSearch("");
    selectionRef.current = next.id;
    setSelected(next);
    setView("Chat");
    setSearchOpen(false);
    setNotificationsOpen(false);
    setMobile(false);
    setChatListOpen(false);
    setDeleteTarget(null);
    setError("");
  }
  async function send(e) {
    e.preventDefault();
    if (busy || (!text.trim() && !attachment)) return;
    setBusy(true);
    setError("");
    const currentSelection = selected.id;
    const message = {
      id: uid(),
      channel: selected.id,
      userId: user.id,
      name: currentUser.name,
      text: text.trim(),
      createdAt: Date.now(),
      ...(selected.private ? { recipient: selected.recipient } : {}),
      ...(attachment ? { attachment } : {}),
    };
    try {
      if (demo)
        await updateDemo((next) => {
          next.messages = { ...next.messages, [message.id]: message };
        });
      else await cloud.sendMessage(message);
      delete drafts.current[currentSelection];
      if (selectionRef.current === currentSelection) {
        setText("");
        setAttachment(null);
      }
    } catch (err) {
      report(err);
    } finally {
      setBusy(false);
    }
  }
  async function chooseFile(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || busy) return;
    setError("");
    try {
      setBusy(true);
      const fileSelection = selectionRef.current;
      const result = await prepareAttachment(file, demo);
      drafts.current[fileSelection] = {
        ...drafts.current[fileSelection],
        attachment: result,
      };
      if (selectionRef.current === fileSelection) setAttachment(result);
    } catch (err) {
      report(err);
    } finally {
      setBusy(false);
    }
  }
  async function toggleFavorite(id = selected.id) {
    if (typeof id !== "string") id = selected.id;
    try {
      const favorite = Boolean(preferences.favorites?.[id]);
      if (demo)
        await updateDemo((next) => {
          next.preferences = {
            ...next.preferences,
            favorites: { ...next.preferences?.favorites },
          };
          if (favorite) delete next.preferences.favorites[id];
          else next.preferences.favorites[id] = true;
        });
      else await cloud.setFavorite(user.id, id, !favorite);
      setNotice(favorite ? "Removed from favorites." : "Added to favorites.");
    } catch (err) {
      report(err);
    }
  }
  async function addChannel(value) {
    if (Object.values(data.channels).some((c) => c.name === value.name))
      throw new Error("A channel with this name already exists.");
    if (demo)
      await updateDemo((next) => {
        next.channels[value.id] = value;
      });
    else await cloud.addChannel({ ...value, createdBy: user.id });
    select({ id: value.id, private: false });
  }
  async function removeMessage() {
    try {
      if (demo)
        await updateDemo((next) => {
          delete next.messages[deleteTarget.id];
        });
      else await cloud.deleteMessage(deleteTarget);
      setDeleteTarget(null);
    } catch (err) {
      report(err);
    }
  }
  function startCall(video) {
    if (demo) {
      setError(
        "Calls need two signed-in users. Connect Firebase to test voice and video calls.",
      );
      return;
    }
    if (!other) {
      setError("Select a person under Private chats to call them.");
      return;
    }
    const session = createCall({ user: currentUser, other, video });
    callRef.current = session;
    setCall(session);
    session.start();
  }
  function count(id) {
    return selected.id === id && view === "Chat"
      ? 0
      : unreadCount(allMessages[id], preferences.lastRead?.[id] || 0, user.id);
  }
  async function saveSetting(key, value) {
    if (demo)
      await updateDemo((next) => {
        next.preferences = {
          ...next.preferences,
          settings: { ...next.preferences?.settings, [key]: value },
        };
      });
    else await cloud.setSetting(user.id, key, value);
    if (key === "theme") applyTheme(value);
  }
  async function markNotification(id) {
    if (demo)
      await updateDemo((next) => {
        next.preferences = {
          ...next.preferences,
          notificationRead: {
            ...next.preferences?.notificationRead,
            [id]: true,
          },
        };
      });
    else await cloud.readNotification(user.id, id);
  }
  async function saveUserProfile(profile) {
    if (demo)
      await updateDemo((next) => {
        next.users[user.id] = { ...next.users[user.id], ...profile };
      });
    else await cloud.saveProfile(profile);
  }
  function navigate(next, item) {
    setSearchOpen(false);
    setNotificationsOpen(false);
    setGlobalSearch("");
    if (next === "Notifications") {
      setNotificationsOpen(true);
      setMobile(false);
      return;
    }
    setView(next);
    setMobile(false);
    if (next === "Chat" && item?.chat) {
      if (item.recipient)
        select({
          id: item.chat,
          private: true,
          recipient: item.recipient,
          name: data.users?.[item.recipient]?.name || "Private chat",
        });
      else select({ id: item.chat, private: false });
    }
  }
  function privateButton(person, favoriteList = false) {
    const id = conversationId(user.id, person.id),
      unread = count(id);
    return (
      <div className="conversation-row" key={(favoriteList ? "fav-" : "") + id}>
        <button
          className={`conversation-button ${selected.id === id && view === "Chat" ? "active" : ""}`}
          onClick={() =>
            select({
              id,
              private: true,
              recipient: person.id,
              name: person.name,
            })
          }
        >
          <span
            className={`presence-dot ${data.presence?.[person.id]?.online ? "online" : ""}`}
            aria-label={
              data.presence?.[person.id]?.online ? "Online" : "Offline"
            }
          />
          <span>{person.name}</span>
          {unread > 0 && (
            <span className="unread">{unread > 99 ? "99+" : unread}</span>
          )}
        </button>
        <button
          className={
            "row-star icon-button " +
            (preferences.favorites?.[id] ? "starred" : "")
          }
          aria-label={
            (preferences.favorites?.[id] ? "Unfavorite " : "Favorite ") +
            person.name
          }
          onClick={() => toggleFavorite(id)}
        >
          <Star
            size={14}
            fill={preferences.favorites?.[id] ? "currentColor" : "none"}
          />
        </button>
      </div>
    );
  }
  const sectionLabels = {
    Dashboard: "Dashboard",
    Chat: "Chat",
    Teams: "Teams",
    Workspaces: "Projects",
    Tasks: "Tasks",
    Calendar: "Calendar",
    Discussions: "Board",
    Storage: "Files",
    Notifications: "Notifications",
    Settings: "Settings",
    Profile: "Profile",
  };
  const searchResults = [];
  const term = globalSearch.trim().toLowerCase();
  if (term) {
    const add = (label, kind, action) => {
      if (
        searchResults.length < 20 &&
        String(label).toLowerCase().includes(term)
      )
        searchResults.push({ label, kind, action });
    };
    Object.values(data.channels || {}).forEach((c) =>
      add("# " + c.name, "Channel", () => select({ id: c.id, private: false })),
    );
    Object.values(data.users || {})
      .filter((p) => p.id !== user.id)
      .forEach((p) =>
        add(p.name, "Person", () =>
          select({
            id: conversationId(user.id, p.id),
            private: true,
            recipient: p.id,
            name: p.name,
          }),
        ),
      );
    for (const [chat, list] of Object.entries(allMessages))
      for (const m of Object.values(list || {})) {
        const label = m.text || m.attachment?.name || "";
        add(label, "Message", () => {
          const recipient = m.recipient
            ? m.userId === user.id
              ? m.recipient
              : m.userId
            : undefined;
          select(
            recipient
              ? {
                  id: chat,
                  private: true,
                  recipient,
                  name: data.users?.[recipient]?.name || "Private chat",
                }
              : { id: chat, private: false },
          );
        });
      }
    const scoped = (team, key, target) =>
      Object.values(team[key] || {}).forEach((item) =>
        add(item.title || item.name, sectionLabels[target], () => {
          setContext({
            teamId: team.id,
            workspaceId: item.workspaceId || "",
            libraryScope: "team",
            search: item.title || item.name,
            searchToken: uid(),
          });
          navigate(target);
        }),
      );
    for (const team of Object.values(model.teams)) {
      scoped(team, "tasks", "Tasks");
      scoped(team, "events", "Calendar");
      scoped(team, "topics", "Discussions");
      scoped(team, "files", "Storage");
    }
    Object.values(model.library.files || {}).forEach((file) =>
      add(file.name, "My files", () => {
        setContext({
          ...context,
          libraryScope: "personal",
          search: file.name,
          searchToken: uid(),
        });
        navigate("Storage");
      }),
    );
  }
  function channelButton(c) {
    const unread = count(c.id);
    return (
      <div className="conversation-row" key={c.id}>
        <button
          key={c.id}
          className={`conversation-button ${selected.id === c.id ? "active" : ""}`}
          onClick={() => select({ id: c.id, private: false })}
        >
          <Hash size={17} />
          <span>{c.name}</span>
          {unread > 0 && (
            <span className="unread" aria-label={`${unread} unread messages`}>
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </button>
        <button
          className={
            "row-star icon-button " +
            (preferences.favorites?.[c.id] ? "starred" : "")
          }
          aria-label={
            (preferences.favorites?.[c.id]
              ? "Unfavorite channel "
              : "Favorite channel ") + c.name
          }
          onClick={() => toggleFavorite(c.id)}
        >
          <Star
            size={14}
            fill={preferences.favorites?.[c.id] ? "currentColor" : "none"}
          />
        </button>
      </div>
    );
  }
  return (
    <div className="chat-app">
      <aside
        className={`sidebar ${mobile ? "open" : ""}`}
        inert={mobileLayout && !mobile}
      >
        <div className="sidebar-brand">
          <img className="brand-logo" src={logo} alt="FlabbyChat logo" />
          <strong className="brand-name">FlabbyChat</strong>
          <button
            className="icon-button mobile-notifications"
            aria-label="Mobile notifications"
            onClick={() => navigate("Notifications")}
          >
            <Bell size={19} />
            {notificationCount > 0 && <span className="notification-dot" />}
          </button>
          <button
            className="icon-button mobile-close"
            aria-label="Close menu"
            onClick={() => setMobile(false)}
          >
            <X size={19} />
          </button>
        </div>
        {demo && <div className="demo-label">Demo · saved in this browser</div>}
        <div className="sidebar-scroll">
          <nav className="sidebar-nav" aria-label="Main navigation">
            {[
              ["Dashboard", "Dashboard", LayoutDashboard],
              ["Chat", "Chat", MessageCircle],
              ["Teams", "Teams", Users],
              ["Workspaces", "Projects", LayoutGrid],
              ["Tasks", "Tasks", CheckSquare],
              ["Calendar", "Calendar", CalendarDays],
              ["Discussions", "Board", MessagesSquare],
              ["Storage", "Files", FolderOpen],
              ["Settings", "Settings", Settings],
            ].map(([route, label, Icon]) => (
              <button
                key={route}
                className={"nav-link " + (view === route ? "active" : "")}
                aria-label={label}
                aria-current={view === route ? "page" : undefined}
                onClick={() => navigate(route)}
              >
                <Icon size={18} />
                <span>{label}</span>
              </button>
            ))}
          </nav>
        </div>
        <div className="sidebar-profile">
          <Avatar name={currentUser.name} photoURL={currentUser.photoURL} />
          <button
            className="profile-identity"
            aria-label="Edit profile"
            onClick={() => navigate("Profile")}
          >
            <strong title={currentUser.name}>{currentUser.name}</strong>
            <small title={currentUser.email || user.email}>
              {currentUser.email || user.email}
            </small>
          </button>
          <button
            className="icon-button"
            aria-label="Logout"
            onClick={async () => {
              try {
                await onLogout();
              } catch (err) {
                report(err);
              }
            }}
          >
            <LogOut size={18} />
          </button>
        </div>
      </aside>
      {mobile && (
        <button
          className="menu-backdrop"
          aria-label="Close navigation"
          onClick={() => setMobile(false)}
        />
      )}
      <div className="app-content">
        <header className="app-header" ref={headerRef}>
          <div className="header-location">
            <button
              className="icon-button global-menu-toggle"
              aria-label="Open menu"
              onClick={() => {
                setMobile(true);
                setSearchOpen(false);
                setNotificationsOpen(false);
              }}
            >
              <Menu size={21} />
            </button>
            <span>{sectionLabels[view]}</span>
          </div>
          <button
            className="icon-button mobile-search-toggle"
            aria-label={searchOpen ? "Close search" : "Open search"}
            aria-expanded={searchOpen}
            aria-controls="app-search-panel"
            onClick={() => {
              setSearchOpen(!searchOpen);
              setNotificationsOpen(false);
              setGlobalSearch("");
            }}
          >
            {searchOpen ? <X size={21} /> : <Search size={21} />}
          </button>
          {(!mobileLayout || searchOpen) && (
            <div
              id="app-search-panel"
              className="app-search"
              onBlur={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget))
                  setGlobalSearch("");
              }}
            >
              <label>
                <Search size={17} />
                <input
                  ref={searchInputRef}
                  aria-label="Search app"
                  placeholder="Search…"
                  value={globalSearch}
                  onChange={(e) => setGlobalSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      setGlobalSearch("");
                      setSearchOpen(false);
                    }
                  }}
                />
                {globalSearch && (
                  <button
                    className="icon-button"
                    aria-label="Clear app search"
                    onClick={() => setGlobalSearch("")}
                  >
                    <X size={14} />
                  </button>
                )}
              </label>
              {term && (
                <div
                  className="search-results"
                  role="region"
                  aria-label="Search results"
                >
                  {searchResults.length ? (
                    searchResults.map((result, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          result.action();
                          setGlobalSearch("");
                          setSearchOpen(false);
                        }}
                      >
                        <span>{result.label}</span>
                        <small>{result.kind}</small>
                      </button>
                    ))
                  ) : (
                    <p>No matching results.</p>
                  )}
                </div>
              )}
            </div>
          )}
          <div className="app-header-actions">
            <button
              className={
                "icon-button header-bell " +
                (notificationsOpen ? "selected" : "")
              }
              aria-label="Notifications"
              title="Notifications"
              aria-expanded={notificationsOpen}
              aria-controls="notification-panel"
              onClick={() => {
                setNotificationsOpen(!notificationsOpen);
                setSearchOpen(false);
              }}
            >
              <Bell size={20} />
              {notificationCount > 0 && (
                <span>
                  {notificationCount > 99 ? "99+" : notificationCount}
                </span>
              )}
            </button>
            <button
              className="header-profile"
              aria-label="Profile"
              title="Profile"
              onClick={() => navigate("Profile")}
            >
              <Avatar name={currentUser.name} photoURL={currentUser.photoURL} />
            </button>
          </div>
          {notificationsOpen && (
            <NotificationDropdown
              notifications={notifications}
              preferences={preferences}
              onRead={markNotification}
              onClose={() => setNotificationsOpen(false)}
              onOpen={(n) => {
                if (n.chat) navigate("Chat", n);
                else {
                  setContext({
                    teamId: n.teamId,
                    workspaceId: n.workspaceId || "",
                  });
                  navigate(n.target || "Tasks");
                }
              }}
            />
          )}
        </header>
        <div className="app-body">
          {view === "Chat" ? (
            <div className="chat-workspace">
              <aside
                className={"chat-list " + (chatListOpen ? "open" : "")}
                aria-label="Chat list"
                inert={chatDrawer && !chatListOpen}
              >
                <header>
                  <h2>Chats</h2>
                  <button
                    className="icon-button local-close"
                    aria-label="Close chat list"
                    onClick={() => setChatListOpen(false)}
                  >
                    <X size={18} />
                  </button>
                </header>
                <div className="chat-list-scroll">
                  <div className="section-title">
                    <h2>Favorites</h2>
                    <Star size={15} />
                  </div>
                  {Object.values(data.channels || {})
                    .filter((c) => preferences.favorites?.[c.id])
                    .map(channelButton)}
                  {Object.values(data.users || {})
                    .filter(
                      (p) =>
                        p.id !== user.id &&
                        preferences.favorites?.[conversationId(user.id, p.id)],
                    )
                    .map((p) => privateButton(p, true))}
                  {!Object.values(data.users || {}).some(
                    (p) =>
                      p.id !== user.id &&
                      preferences.favorites?.[conversationId(user.id, p.id)],
                  ) &&
                    !Object.values(data.channels || {}).some(
                      (c) => preferences.favorites?.[c.id],
                    ) && (
                      <p className="sidebar-help">
                        Use the star beside a channel or private chat.
                      </p>
                    )}
                  <div className="section-title">
                    <h2>Channels</h2>
                    <button
                      className="icon-button"
                      aria-label="Create channel"
                      onClick={() => setChannelDialog(true)}
                    >
                      <Plus size={18} />
                    </button>
                  </div>
                  {Object.values(data.channels || {}).map(channelButton)}
                  <div className="section-title">
                    <h2>Private chats</h2>
                  </div>
                  {Object.values(data.users || {})
                    .filter((p) => p.id !== user.id)
                    .map((p) => privateButton(p))}
                  {Object.keys(data.users || {}).length < 2 && (
                    <p className="sidebar-help">
                      Other registered users will appear here.
                    </p>
                  )}
                </div>
              </aside>
              {chatListOpen && (
                <button
                  className="chat-list-backdrop"
                  aria-label="Close chat list overlay"
                  onClick={() => setChatListOpen(false)}
                />
              )}
              <main className="chat-main">
                <header className="chat-header">
                  <button
                    className="icon-button chat-list-toggle"
                    aria-label="Show chats"
                    title="Show chats"
                    onClick={() => setChatListOpen(true)}
                  >
                    <MessagesSquare size={20} />
                  </button>
                  <div className="chat-title">
                    <h2>
                      {selected.private ? "" : "# "}
                      {channel.name}
                    </h2>
                    <p>
                      {channel.description}
                      {selected.private
                        ? data.presence?.[other.id]?.online
                          ? " · Online"
                          : " · Offline"
                        : ""}
                    </p>
                  </div>
                  <div className="header-actions">
                    <button
                      className="icon-button"
                      aria-label="Export conversation"
                      title="Export conversation"
                      onClick={() => {
                        download(
                          "flabbychat-" + selected.id + ".json",
                          JSON.stringify(
                            {
                              conversation: selected.id,
                              exportedAt: new Date().toISOString(),
                              messages: filterMessages(messages),
                            },
                            null,
                            2,
                          ),
                        );
                        setNotice("Conversation exported.");
                      }}
                    >
                      <Download size={18} />
                    </button>
                    {
                      <button
                        className={`icon-button favorite-button ${preferences.favorites?.[selected.id] ? "starred" : ""}`}
                        aria-label={
                          preferences.favorites?.[selected.id]
                            ? "Remove from favorites"
                            : "Add to favorites"
                        }
                        onClick={toggleFavorite}
                      >
                        <Star
                          size={20}
                          fill={
                            preferences.favorites?.[selected.id]
                              ? "currentColor"
                              : "none"
                          }
                        />
                      </button>
                    }
                    {selected.private &&
                      other &&
                      !demo &&
                      cloud.configured &&
                      window.isSecureContext &&
                      navigator.mediaDevices?.getUserMedia && (
                        <>
                          <button
                            className="icon-button"
                            aria-label="Voice call"
                            title={
                              selected.private
                                ? "Voice call"
                                : "Select a private chat to call"
                            }
                            onClick={() => startCall(false)}
                          >
                            <Phone size={19} />
                          </button>
                          <button
                            className="icon-button"
                            aria-label="Video call"
                            title={
                              selected.private
                                ? "Video call"
                                : "Select a private chat to call"
                            }
                            onClick={() => startCall(true)}
                          >
                            <Video size={20} />
                          </button>
                        </>
                      )}
                  </div>
                </header>
                <div className="chat-toolbar">
                  <label className="message-search">
                    <Search size={17} />
                    <input
                      aria-label="Search messages"
                      placeholder="Search messages or names"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                    {query && (
                      <button
                        className="icon-button"
                        aria-label="Clear search"
                        onClick={() => setQuery("")}
                      >
                        <X size={15} />
                      </button>
                    )}
                  </label>
                  <span>
                    {selected.private
                      ? "Private chat"
                      : `${Object.keys(data.users || {}).length} users`}
                  </span>
                </div>
                {error && (
                  <div className="error chat-error" role="alert">
                    <span>{error}</span>
                    <button
                      className="icon-button"
                      aria-label="Dismiss error"
                      onClick={() => setError("")}
                    >
                      <X size={17} />
                    </button>
                  </div>
                )}
                <section className="messages" aria-label="Messages">
                  {loading ? (
                    <div className="empty-state">Loading messages…</div>
                  ) : !displayMessages.length ? (
                    <div className="empty-state">
                      <MessageCircle size={35} />
                      <h3>{query ? "No messages found" : "No messages yet"}</h3>
                      <p>
                        {query
                          ? "Try another word or name."
                          : "Send the first message in this conversation."}
                      </p>
                    </div>
                  ) : (
                    displayMessages.map((message, index) => {
                      const previous = displayMessages[index - 1];
                      const showDate =
                        !previous ||
                        new Date(previous.createdAt).toDateString() !==
                          new Date(message.createdAt).toDateString();
                      const own = message.userId === user.id;
                      return (
                        <React.Fragment key={message.id}>
                          {showDate && (
                            <div className="date-divider">
                              <span>
                                {new Date(message.createdAt).toLocaleDateString(
                                  undefined,
                                  {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                  },
                                )}
                              </span>
                            </div>
                          )}
                          <article className={`message ${own ? "own" : ""}`}>
                            <Avatar
                              name={
                                data.users?.[message.userId]?.name ||
                                message.name
                              }
                              photoURL={data.users?.[message.userId]?.photoURL}
                            />
                            <div className="message-content">
                              <div className="message-meta">
                                <strong>{message.name}</strong>
                                {own && <span>You</span>}
                                <time
                                  dateTime={new Date(
                                    message.createdAt,
                                  ).toISOString()}
                                >
                                  {new Date(
                                    message.createdAt,
                                  ).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </time>
                              </div>
                              {message.kind === "call" ? (
                                <div className="call-history-entry">
                                  {message.call.video ? (
                                    <Video size={18} />
                                  ) : (
                                    <Phone size={18} />
                                  )}
                                  <span>
                                    {message.text}
                                    {message.call.duration > 0
                                      ? " · " +
                                        Math.floor(message.call.duration / 60) +
                                        "m " +
                                        (message.call.duration % 60) +
                                        "s"
                                      : ""}
                                    <small>
                                      {new Date(
                                        message.createdAt,
                                      ).toLocaleString()}
                                    </small>
                                  </span>
                                </div>
                              ) : (
                                message.text && <p>{message.text}</p>
                              )}
                              {message.attachment &&
                                safeAttachmentUrl(message.attachment.url) && (
                                  <div className="message-file">
                                    <button
                                      type="button"
                                      className={
                                        message.attachment.kind === "image"
                                          ? "attachment-preview-button"
                                          : "attachment-preview-button pdf-attachment"
                                      }
                                      aria-label={
                                        "Preview " + message.attachment.name
                                      }
                                      onClick={() =>
                                        setPreviewFile(message.attachment)
                                      }
                                    >
                                      {message.attachment.kind === "image" ? (
                                        <img
                                          src={safeAttachmentUrl(
                                            message.attachment.url,
                                          )}
                                          alt={message.attachment.name}
                                          onLoad={() =>
                                            bottom.current?.scrollIntoView?.({
                                              behavior: "smooth",
                                            })
                                          }
                                        />
                                      ) : (
                                        <FileText size={26} />
                                      )}
                                      <span>
                                        <strong>
                                          {message.attachment.name}
                                        </strong>
                                        <small>
                                          {message.attachment.kind === "pdf"
                                            ? "PDF · " +
                                              (
                                                message.attachment.size / 1024
                                              ).toFixed(0) +
                                              " KB · "
                                            : ""}
                                          View file
                                        </small>
                                      </span>
                                    </button>
                                  </div>
                                )}
                              {message.image &&
                                /^data:image\/(png|jpeg|webp|gif);base64,/.test(
                                  message.image,
                                ) && (
                                  <div className="message-image">
                                    <button
                                      type="button"
                                      className="attachment-preview-button"
                                      aria-label={
                                        "Preview " +
                                        (message.imageName || "image")
                                      }
                                      onClick={() =>
                                        setPreviewFile({
                                          url: message.image,
                                          name:
                                            message.imageName || "image.png",
                                          kind: "image",
                                        })
                                      }
                                    >
                                      <img
                                        src={message.image}
                                        alt={
                                          message.imageName || "Shared image"
                                        }
                                        onLoad={() =>
                                          bottom.current?.scrollIntoView?.({
                                            behavior: "smooth",
                                          })
                                        }
                                      />
                                      <span>View image</span>
                                    </button>
                                  </div>
                                )}
                            </div>
                            {own && message.kind !== "call" && (
                              <button
                                className="icon-button delete-message"
                                aria-label="Delete your message"
                                onClick={() => setDeleteTarget(message)}
                              >
                                <Trash2 size={15} />
                              </button>
                            )}
                          </article>
                        </React.Fragment>
                      );
                    })
                  )}
                  <div ref={bottom} />
                </section>
                <form className="composer" onSubmit={send}>
                  {attachment && (
                    <div className="image-preview">
                      {attachment.kind === "image" ? (
                        <img src={attachment.url} alt="Image to send" />
                      ) : (
                        <FileText size={28} />
                      )}
                      <span>{attachment.name}</span>
                      <button
                        type="button"
                        className="icon-button"
                        aria-label="Remove attachment"
                        onClick={() => {
                          setAttachment(null);
                          drafts.current[selected.id] = {
                            ...drafts.current[selected.id],
                            attachment: null,
                          };
                        }}
                      >
                        <X size={17} />
                      </button>
                    </div>
                  )}
                  <div className="composer-row">
                    <button
                      type="button"
                      className="icon-button"
                      aria-label="Attach file"
                      onClick={() => fileInput.current.click()}
                      disabled={busy}
                    >
                      <Paperclip size={21} />
                    </button>
                    <textarea
                      aria-label="Message"
                      disabled={busy}
                      placeholder={`Message ${selected.private ? channel.name : "#" + channel.name}`}
                      rows={1}
                      maxLength={4000}
                      value={text}
                      onChange={(e) => {
                        setText(e.target.value);
                        drafts.current[selected.id] = {
                          ...drafts.current[selected.id],
                          text: e.target.value,
                        };
                      }}
                      onKeyDown={(e) => {
                        if (
                          e.key === "Enter" &&
                          !e.shiftKey &&
                          !e.nativeEvent.isComposing
                        ) {
                          e.preventDefault();
                          send(e);
                        }
                      }}
                    />
                    <button
                      className="primary send-button"
                      aria-label="Send message"
                      disabled={busy || (!text.trim() && !attachment)}
                    >
                      <Send size={18} />
                      <span>{busy ? "Sending…" : "Send"}</span>
                    </button>
                  </div>
                  <small>
                    Enter to send · Shift + Enter for a new line ·{" "}
                    {!demo && storageConfigured
                      ? "PDFs and images up to 5 MB"
                      : demo
                        ? "Demo files up to 250 KB"
                        : "Images up to 250 KB"}
                  </small>
                </form>
                <input
                  hidden
                  ref={fileInput}
                  aria-label="Choose file"
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif,application/pdf"
                  onChange={chooseFile}
                />
              </main>
            </div>
          ) : (
            <Collaboration
              view={view}
              model={model}
              user={currentUser}
              users={data.users || {}}
              demo={demo}
              preferences={preferences}
              context={context}
              setContext={setContext}
              onNavigate={navigate}
              onMenu={() => setMobile(true)}
              onShare={setShareFile}
              onPreview={setPreviewFile}
              onProfile={saveUserProfile}
              onSetting={saveSetting}
              notifications={notifications}
              onNotice={setNotice}
            />
          )}
        </div>
      </div>
      {previewFile && (
        <FilePreview
          file={previewFile}
          onClose={() => setPreviewFile(null)}
          onNotice={setNotice}
        />
      )}
      {notice && (
        <div
          className="success-toast"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          <CircleCheck size={19} aria-hidden="true" />
          <span>{notice}</span>
          <button
            className="icon-button"
            aria-label="Dismiss success message"
            onClick={() => setNotice("")}
          >
            <X size={15} />
          </button>
        </div>
      )}
      {shareFile && (
        <Dialog title="Share file in chat" onClose={() => setShareFile(null)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const id = new FormData(e.currentTarget).get("chat");
              const person = Object.values(data.users || {}).find(
                (p) => p.id !== user.id && conversationId(user.id, p.id) === id,
              );
              drafts.current[id] = {
                ...drafts.current[id],
                attachment: {
                  name: shareFile.name,
                  url: shareFile.url,
                  kind: shareFile.kind,
                  size: shareFile.size,
                },
              };
              select(
                person
                  ? {
                      id,
                      private: true,
                      recipient: person.id,
                      name: person.name,
                    }
                  : { id, private: false },
              );
              setText(drafts.current[id].text || "");
              setAttachment(drafts.current[id].attachment);
              setShareFile(null);
              setNotice(
                "File attached to this conversation. Press Send to share it.",
              );
            }}
          >
            <label>
              Conversation
              <select name="chat" defaultValue={selected.id}>
                {Object.values(data.channels || {}).map((c) => (
                  <option key={c.id} value={c.id}>
                    # {c.name}
                  </option>
                ))}
                {Object.values(data.users || {})
                  .filter((p) => p.id !== user.id)
                  .map((p) => (
                    <option key={p.id} value={conversationId(user.id, p.id)}>
                      {p.name} (private)
                    </option>
                  ))}
              </select>
            </label>
            <button className="primary">Attach to conversation</button>
          </form>
        </Dialog>
      )}
      {channelDialog && (
        <ChannelDialog
          onClose={() => setChannelDialog(false)}
          onCreate={addChannel}
        />
      )}
      {call && (
        <CallDialog
          session={call}
          soundEnabled={preferences.settings?.callSound !== false}
          onClose={() => {
            callRef.current = null;
            setCall(null);
          }}
        />
      )}
      {deleteTarget && (
        <DeleteDialog
          onClose={() => setDeleteTarget(null)}
          onConfirm={removeMessage}
        />
      )}
    </div>
  );
}
function DeleteDialog({ onClose, onConfirm }) {
  const dialog = useRef();
  useEffect(() => {
    const el = dialog.current;
    el.showModal();
    return () => el.close();
  }, []);
  return (
    <dialog
      className="form-dialog"
      ref={dialog}
      aria-labelledby="delete-title"
      onCancel={onClose}
    >
      <h2 id="delete-title">Delete your message?</h2>
      <p>This message will be removed from the conversation.</p>
      <div className="dialog-actions">
        <button className="secondary" onClick={onClose}>
          Cancel
        </button>
        <button className="danger" onClick={onConfirm}>
          Delete message
        </button>
      </div>
    </dialog>
  );
}
