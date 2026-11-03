import { initializeApp } from "firebase/app";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
  sendEmailVerification,
  sendPasswordResetEmail,
  reload,
  getIdToken,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from "firebase/auth";
import {
  getDatabase,
  ref,
  onValue,
  set,
  update,
  remove,
  onDisconnect,
  runTransaction,
} from "firebase/database";
import { general, uid } from "../utils/chat-data.js";

const env = import.meta.env;

export const configured = Boolean(
  env.VITE_FIREBASE_API_KEY &&
  env.VITE_FIREBASE_DATABASE_URL &&
  env.VITE_FIREBASE_PROJECT_ID,
);

const app = configured
  ? initializeApp({
      apiKey: env.VITE_FIREBASE_API_KEY,
      authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
      databaseURL: env.VITE_FIREBASE_DATABASE_URL,
      projectId: env.VITE_FIREBASE_PROJECT_ID,
      appId: env.VITE_FIREBASE_APP_ID,
    })
  : null;

export const auth = app ? getAuth(app) : null;

export const db = app ? getDatabase(app) : null;

const path = (value) => ref(db, "collegeChat/" + value);

export const watchAuth = (callback) =>
  auth ? onAuthStateChanged(auth, callback) : () => {};

export const login = (email, password) =>
  signInWithEmailAndPassword(auth, email, password);

export async function signup(name, email, password) {
  const result = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(result.user, { displayName: name });
  return result.user;
}

const presenceStops = new Set();

export async function logout() {
  const cleanup = Promise.all([...presenceStops].map((stop) => stop()));
  let timeout;
  try {
    await Promise.race([
      cleanup,
      new Promise((resolve) => {
        timeout = setTimeout(resolve, 2000);
      }),
    ]);
  } finally {
    clearTimeout(timeout);
  }
  return signOut(auth);
}

export const resetPassword = (email) => sendPasswordResetEmail(auth, email);

// Share one pending request across remounts, and limit resend to once a minute.
const verificationRequests = new Map();

export function sendVerification(user) {
  const previous = verificationRequests.get(user.uid);
  if (previous && Date.now() - previous.sentAt < 60000) return previous.promise;
  const request = { sentAt: Date.now(), promise: null };
  request.promise = sendEmailVerification(user)
    .then(() => request.sentAt)
    .catch((error) => {
      verificationRequests.delete(user.uid);
      throw error;
    });
  verificationRequests.set(user.uid, request);
  return request.promise;
}

export async function refreshVerification(user) {
  await reload(user);
  if (user.emailVerified) await getIdToken(user, true);
  return user;
}

// Seed a missing profile without replacing edits saved during earlier sessions.
export async function ensureProfile(user) {
  if (!user.emailVerified) return;
  await runTransaction(
    path("users/" + user.uid),
    (current) =>
      current || {
        id: user.uid,
        name: user.displayName || user.email.split("@")[0],
      },
  );
}

// These subscriptions arrive independently; emit their latest combined state.
export function watchDirectory(callback, onError) {
  let channels = { general },
    users = {},
    presence = {};
  const emit = () => callback({ channels, users, presence });
  const stopChannels = onValue(
    path("channels"),
    (snap) => {
      channels = { general, ...snap.val() };
      emit();
    },
    onError,
  );
  const stopUsers = onValue(
    path("users"),
    (snap) => {
      users = snap.val() || {};
      emit();
    },
    onError,
  );
  const stopPresence = onValue(
    path("presence"),
    (snap) => {
      presence = Object.fromEntries(
        Object.entries(snap.val() || {}).map(([id, value]) => [
          id,
          {
            online: Object.values(value.sessions || {}).some(
              (visible) => visible === true,
            ),
          },
        ]),
      );
      emit();
    },
    onError,
  );
  return () => {
    stopChannels();
    stopUsers();
    stopPresence();
  };
}

export function trackPresence(userId) {
  // Each tab owns its own session so closing a background tab cannot hide another.
  const target = path("presence/" + userId + "/sessions/" + uid());
  let active = true,
    connected = false,
    ready = false,
    pageVisible = !document.hidden;
  const publish = () => {
    if (!active || !connected || !ready) return;
    const operation = pageVisible ? set(target, true) : remove(target);
    operation.catch((error) =>
      console.warn("Presence unavailable:", error.code),
    );
  };
  const visibility = () => {
    pageVisible = !document.hidden;
    publish();
  };
  const hide = () => {
    pageVisible = false;
    publish();
  };
  document.addEventListener("visibilitychange", visibility);
  window.addEventListener("pagehide", hide);
  window.addEventListener("pageshow", visibility);
  const unsubscribe = onValue(ref(db, ".info/connected"), async (snapshot) => {
    connected = Boolean(snapshot.val());
    ready = false;
    if (!connected || !active) return;
    try {
      // Arm cleanup before announcing this tab. It is re-armed after reconnects.
      await onDisconnect(target).remove();
      ready = active && connected;
      publish();
    } catch (error) {
      console.warn("Presence unavailable:", error.code);
    }
  });
  const stop = () => {
    if (!active) return Promise.resolve();
    active = false;
    unsubscribe();
    document.removeEventListener("visibilitychange", visibility);
    window.removeEventListener("pagehide", hide);
    window.removeEventListener("pageshow", visibility);
    presenceStops.delete(stop);
    // Keep disconnect cleanup armed if this client loses its network during logout.
    if (!connected) return Promise.resolve();
    return remove(target).catch(() => {});
  };
  presenceStops.add(stop);
  return stop;
}

function messagePath(channel, userId, recipient) {
  if (!recipient) return "messages/" + channel;
  const [a, b] = [userId, recipient].sort();
  return "direct/" + a + "/" + b;
}

// Merge private call history into the same feed as conversation messages.
export function watchMessages(channel, userId, recipient, callback, onError) {
  let messages = {},
    calls = {};
  const emit = () => callback({ ...messages, ...calls });
  const stop = onValue(
    path(messagePath(channel, userId, recipient)),
    (snap) => {
      messages = snap.val() || {};
      emit();
    },
    onError,
  );
  let stopCalls = () => {};
  if (recipient) {
    const [a, b] = [userId, recipient].sort();
    stopCalls = onValue(
      path("callHistory/" + a + "/" + b),
      (snap) => {
        calls = Object.fromEntries(
          Object.entries(snap.val() || {}).map(([id, original]) => {
            const call =
              original.outcome === "ringing" &&
              Date.now() - original.createdAt > 90000
                ? {
                    ...original,
                    outcome: "missed",
                    endedAt: original.createdAt + 45000,
                  }
                : original;
            return [
              "call-" + id,
              {
                id: "call-" + id,
                channel,
                userId: call.caller,
                recipient: call.receiver,
                name: call.callerName,
                createdAt: call.createdAt,
                kind: "call",
                call,
                text:
                  (call.video ? "Video call" : "Voice call") +
                  " · " +
                  call.outcome,
              },
            ];
          }),
        );
        emit();
      },
      onError,
    );
  }
  return () => {
    stop();
    stopCalls();
  };
}

export const sendMessage = (message) =>
  set(
    path(
      messagePath(message.channel, message.userId, message.recipient) +
        "/" +
        message.id,
    ),
    message,
  );

export const deleteMessage = (message) =>
  remove(
    path(
      messagePath(message.channel, message.userId, message.recipient) +
        "/" +
        message.id,
    ),
  );

export const addChannel = (channel) =>
  set(path("channels/" + channel.id), channel);

export const watchPreferences = (userId, callback, onError) =>
  onValue(
    path("preferences/" + userId),
    (snap) => callback(snap.val() || { favorites: {}, lastRead: {} }),
    onError,
  );

export const setFavorite = (userId, channel, favorite) =>
  set(
    path("preferences/" + userId + "/favorites/" + channel),
    favorite ? true : null,
  );

export const markRead = (userId, channel, timestamp) =>
  set(path("preferences/" + userId + "/lastRead/" + channel), timestamp);

// Listen for message timestamps to show unread counts in the sidebar.
export function watchUnread(channels, users, userId, callback, onError) {
  const results = {};
  const stops = [];
  const subscribe = (channel, recipient) => {
    stops.push(
      watchMessages(
        channel,
        userId,
        recipient,
        (messages) => {
          results[channel] = messages;
          callback({ ...results });
        },
        onError,
      ),
    );
  };
  Object.keys(channels).forEach((id) => subscribe(id));
  Object.keys(users)
    .filter((id) => id !== userId)
    .forEach((id) => subscribe("dm-" + [id, userId].sort().join("--"), id));
  return () => stops.forEach((stop) => stop());
}

// Call signaling is in calls.js. Media travels through WebRTC, not the database.
export { ref, onValue, set, update, remove };

// A timed-out SDK write may still sync later; only its UI wait is bounded here.
async function confirmProfileWrite(write) {
  const user = auth?.currentUser;
  if (!user) throw new Error("Sign in again to save your profile.");
  if (navigator.onLine === false)
    throw new Error(
      "You are offline. Reconnect, then save your profile again.",
    );
  // The shared directory is the profile source for every screen in the app.
  // Authentication manages credentials; its profile API must not block this save.
  let timeout;
  try {
    return await Promise.race([
      write(user),
      new Promise((_, reject) => {
        timeout = setTimeout(
          () =>
            reject(
              new Error(
                "Profile save was not confirmed. Check your connection and try again. It may still sync when you reconnect.",
              ),
            ),
          15000,
        );
      }),
    ]);
  } finally {
    clearTimeout(timeout);
  }
}

export function saveProfile(profile) {
  return confirmProfileWrite((user) =>
    update(path("users/" + user.uid), {
      id: user.uid,
      name: profile.name,
      bio: profile.bio || "",
      photoURL: profile.photoURL || "",
    }),
  );
}

// Merge the photo transactionally so another session's name/bio edits survive.
export function saveProfilePhoto(photoURL) {
  return confirmProfileWrite(async (user) => {
    const result = await runTransaction(
      path("users/" + user.uid),
      (current) => ({
        ...current,
        id: user.uid,
        name: current?.name || user.displayName || user.email.split("@")[0],
        photoURL: photoURL || "",
      }),
      { applyLocally: false },
    );
    if (!result.committed)
      throw new Error("Your photo was not saved. Please try again.");
  });
}

export async function changePassword(current, password) {
  const user = auth.currentUser;
  await reauthenticateWithCredential(
    user,
    EmailAuthProvider.credential(user.email, current),
  );
  await updatePassword(user, password);
  await getIdToken(user, true);
}

export const setSetting = (userId, key, value) =>
  set(path("preferences/" + userId + "/settings/" + key), value);

export const readNotification = (userId, id) =>
  set(path("preferences/" + userId + "/notificationRead/" + id), true);

export const watchPersonal = (userId, callback, error) =>
  onValue(
    path("libraries/" + userId),
    (snap) => callback(snap.val() || { files: {}, folders: {} }),
    error,
  );

export const writePersonal = (userId, collection, id, value) =>
  set(path("libraries/" + userId + "/" + collection + "/" + id), value);

// Submit both paths together so a rejected move leaves the source intact.
export function transferLibraryFile(
  userId,
  sourceTeamId,
  destinationTeamId,
  sourceId,
  file,
  move,
) {
  const libraryPath = (teamId) =>
    teamId ? "teams/" + teamId : "libraries/" + userId;
  const source = libraryPath(sourceTeamId) + "/files/" + sourceId;
  const destination = libraryPath(destinationTeamId) + "/files/" + file.id;
  return update(path(""), {
    ...(move && source !== destination ? { [source]: null } : {}),
    [destination]: file,
  });
}

// Membership changes add/remove team listeners and discard inaccessible records.
export function watchTeams(userId, callback, error) {
  let teams = {},
    stops = {};
  const stop = onValue(
    path("teamIndex/" + userId),
    (snapshot) => {
      const ids = Object.keys(snapshot.val() || {});
      const activeIds = new Set(ids);
      for (const id of Object.keys(stops)) {
        if (!activeIds.has(id)) {
          stops[id]();
          delete stops[id];
          delete teams[id];
        }
      }
      callback({ ...teams });
      for (const id of ids) {
        if (stops[id]) continue;
        stops[id] = onValue(
          path("teams/" + id),
          (snap) => {
            if (snap.val()) teams[id] = snap.val();
            else delete teams[id];
            callback({ ...teams });
          },
          (err) => {
            delete teams[id];
            callback({ ...teams });
            error(err);
          },
        );
      }
    },
    error,
  );
  return () => {
    stop();
    Object.values(stops).forEach((fn) => fn());
  };
}

export async function createTeam(team) {
  await set(path("teams/" + team.id), team);
  await set(path("teamIndex/" + team.owner + "/" + team.id), true);
}

export const writeTeam = (team, collection, id, value) =>
  set(path("teams/" + team + "/" + collection + "/" + id), value);

export async function addTeamMember(team, member) {
  await set(path("teams/" + team + "/members/" + member.id), {
    id: member.id,
    name: member.name,
    status: "active",
    joinedAt: Date.now(),
  });
  await set(path("teamIndex/" + member.id + "/" + team), true);
}

export function transferTeamOwnership(team, memberId) {
  return update(path(""), {
    ["teams/" + team + "/owner"]: memberId,
    ["teamIndex/" + memberId + "/" + team]: true,
  });
}

export async function setTeamMemberStatus(team, userId, status) {
  if (!["active", "on hold"].includes(status))
    throw new Error("Choose a valid member status.");
  return update(path(""), {
    ["teams/" + team + "/members/" + userId + "/status"]: status,
    ["teamIndex/" + userId + "/" + team]: status === "active" ? true : null,
  });
}

export async function removeTeamMember(team, userId) {
  await remove(path("teams/" + team + "/members/" + userId));
  await remove(path("teamIndex/" + userId + "/" + team));
}
