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
  serverTimestamp,
} from "firebase/database";
import { general } from "../utils/chat-data.js";
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
export const logout = () => signOut(auth);
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
      presence = snap.val() || {};
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
  const target = path("presence/" + userId);
  let active = true;
  const stop = onValue(ref(db, ".info/connected"), async (snapshot) => {
    if (!snapshot.val()) return;
    try {
      await onDisconnect(target).set({
        online: false,
        lastSeen: serverTimestamp(),
      });
      if (active)
        await set(target, { online: true, lastSeen: serverTimestamp() });
    } catch (error) {
      console.warn("Presence unavailable:", error.code);
    }
  });
  return () => {
    active = false;
    stop();
    onDisconnect(target)
      .cancel()
      .catch(() => {});
    set(target, { online: false, lastSeen: serverTimestamp() }).catch(() => {});
  };
}
function messagePath(channel, userId, recipient) {
  if (!recipient) return "messages/" + channel;
  const [a, b] = [userId, recipient].sort();
  return "direct/" + a + "/" + b;
}
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
export async function saveProfile(profile) {
  const user = auth.currentUser;
  await updateProfile(user, {
    displayName: profile.name,
    photoURL: profile.photoURL || null,
  });
  await update(path("users/" + user.uid), {
    name: profile.name,
    bio: profile.bio || "",
    photoURL: profile.photoURL || "",
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
export function watchTeams(userId, callback, error) {
  let teams = {},
    stops = {};
  const stop = onValue(
    path("teamIndex/" + userId),
    (snapshot) => {
      const ids = Object.keys(snapshot.val() || {});
      for (const id of Object.keys(stops)) {
        if (!ids.includes(id)) {
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
