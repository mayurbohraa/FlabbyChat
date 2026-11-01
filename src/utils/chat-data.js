// Small helpers shared by the chat screen and its tests.
export const uid = () => crypto.randomUUID();

export const demoUser = {
  id: "mayur",
  name: "Mayur Bohra",
  email: "mayur@example.com",
};

export const general = {
  id: "general",
  name: "general",
  description: "General discussion for the project.",
};

export const conversationId = (a, b) => "dm-" + [a, b].sort().join("--");

export function sampleChat() {
  const now = Date.now();
  return {
    channels: {
      general,
      project: {
        id: "project",
        name: "project",
        description: "Project updates and questions.",
      },
    },
    users: {
      mayur: demoUser,
      hardik: { id: "hardik", name: "Hardik Maheshwari" },
      khushboo: { id: "khushboo", name: "Khushboo Kolte" },
    },
    messages: {
      welcome: {
        id: "welcome",
        channel: "general",
        userId: "khushboo",
        name: "Khushboo Kolte",
        text: "Hi everyone! We can use this channel for our project discussion.",
        createdAt: now - 3600000,
      },
      reply: {
        id: "reply",
        channel: "general",
        userId: "hardik",
        name: "Hardik Maheshwari",
        text: "Sounds good. Share your updates here.",
        createdAt: now - 1800000,
      },
    },
    preferences: { favorites: {}, lastRead: {} },
    presence: {},
  };
}

const key = "flabbychat.simple-demo.v1";

export function loadDemo() {
  const raw = localStorage.getItem(key);
  return raw ? JSON.parse(raw) : sampleChat();
}

export function saveDemo(data) {
  localStorage.setItem(key, JSON.stringify(data));
  // Browser storage events do not fire in the tab that performed the write.
  window.dispatchEvent(new Event("flabbychat:demo"));
}

export const demoStorageKey = key;

export function filterMessages(messages, query = "") {
  const term = query.trim().toLowerCase();
  return Object.values(messages || {})
    .filter((m) =>
      `${m.text || ""} ${m.name || ""}`.toLowerCase().includes(term),
    )
    .sort((a, b) => a.createdAt - b.createdAt);
}

export function unreadCount(messages, lastRead = 0, userId) {
  return Object.values(messages || {}).filter(
    (m) => m.userId !== userId && m.createdAt > lastRead,
  ).length;
}

export function validateSignup(name, password, confirm) {
  if (!name.trim()) return "Enter your name.";
  if (password.length < 8) return "Use a password with at least 8 characters.";
  if (password !== confirm) return "The passwords do not match.";
  return "";
}

export function friendlyError(error) {
  const messages = {
    "auth/invalid-credential": "Incorrect email or password.",
    "auth/requires-recent-login":
      "Sign in again before changing your password.",
    "auth/wrong-password": "The current password is incorrect.",
    "auth/email-already-in-use": "An account with this email already exists.",
    "auth/weak-password": "Choose a stronger password.",
    "auth/invalid-email": "Enter a valid email address.",
    "auth/too-many-requests": "Too many attempts. Please try again later.",
    "auth/network-request-failed":
      "Could not connect. Check your internet connection.",
    "auth/operation-not-allowed":
      "Enable Email/Password sign-in in Firebase Console.",
    "auth/unauthorized-domain":
      "Add this website to Firebase Authentication’s authorized domains.",
    PERMISSION_DENIED:
      "Access denied. Confirm your email is verified and publish the latest database.rules.json in Firebase Console.",
  };
  return (
    messages[error.code] ||
    (/quota/i.test(error.message)
      ? "Browser storage is full. Remove an image or try again in another browser."
      : error.message) ||
    "Something went wrong. Please try again."
  );
}
