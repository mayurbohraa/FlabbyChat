import { beforeEach, it, expect, vi } from "vitest";
import {
  sendVerification,
  refreshVerification,
  signup,
  ensureProfile,
  resetPassword,
  changePassword,
  trackPresence,
  watchDirectory,
  logout,
} from "../services/cloud.js";
import {
  sendEmailVerification,
  reload,
  getIdToken,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  reauthenticateWithCredential,
  updatePassword,
  signOut,
} from "firebase/auth";
import {
  set,
  runTransaction,
  onValue,
  onDisconnect,
  remove,
} from "firebase/database";
vi.hoisted(() => {
  vi.stubEnv("VITE_FIREBASE_API_KEY", "test-key");
  vi.stubEnv("VITE_FIREBASE_PROJECT_ID", "test-project");
  vi.stubEnv(
    "VITE_FIREBASE_DATABASE_URL",
    "https://test-project.firebaseio.com",
  );
});
vi.mock("firebase/app", () => ({ initializeApp: () => ({}) }));
vi.mock("firebase/auth", () => ({
  getAuth: () => ({
    currentUser: { uid: "student", email: "student@example.com" },
  }),
  onAuthStateChanged: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  updateProfile: vi.fn(async () => {}),
  signOut: vi.fn(),
  sendEmailVerification: vi.fn(async () => {}),
  sendPasswordResetEmail: vi.fn(async () => {}),
  reload: vi.fn(async () => {}),
  getIdToken: vi.fn(async () => "fresh-token"),
  EmailAuthProvider: {
    credential: vi.fn((email, password) => ({ email, password })),
  },
  reauthenticateWithCredential: vi.fn(async () => {}),
  updatePassword: vi.fn(async () => {}),
}));
vi.mock("firebase/database", () => ({
  getDatabase: () => ({}),
  ref: (_db, path) => path,
  onValue: vi.fn(),
  set: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  onDisconnect: vi.fn(),
  runTransaction: vi.fn(),
  serverTimestamp: vi.fn(),
}));
beforeEach(() => vi.clearAllMocks());
it("shares verification sends during the cooldown to prevent duplicate emails on remount", async () => {
  const user = { uid: "cooldown-user" };
  await Promise.all([sendVerification(user), sendVerification(user)]);
  expect(sendEmailVerification).toHaveBeenCalledTimes(1);
});
it("refreshes the auth token after email verification", async () => {
  const user = { uid: "verified-user", emailVerified: true };
  await refreshVerification(user);
  expect(reload).toHaveBeenCalledWith(user);
  expect(getIdToken).toHaveBeenCalledWith(user, true);
});
it("does not refresh a token or create a profile while unverified", async () => {
  const user = { uid: "unverified-user", emailVerified: false };
  await refreshVerification(user);
  await ensureProfile(user);
  expect(getIdToken).not.toHaveBeenCalled();
  expect(runTransaction).not.toHaveBeenCalled();
});
it("registers the auth profile without writing chat data before verification", async () => {
  createUserWithEmailAndPassword.mockResolvedValue({
    user: { uid: "new-user", emailVerified: false },
  });
  await signup("Student", "student@example.com", "password123");
  expect(set).not.toHaveBeenCalled();
});
it("uses Firebase to send password reset links", async () => {
  await resetPassword("student@example.com");
  expect(sendPasswordResetEmail.mock.calls[0][1]).toBe("student@example.com");
});

it("reauthenticates with the current password before changing it", async () => {
  await changePassword("current-password", "new-password");
  expect(reauthenticateWithCredential).toHaveBeenCalledWith(
    expect.objectContaining({ email: "student@example.com" }),
    { email: "student@example.com", password: "current-password" },
  );
  expect(updatePassword).toHaveBeenCalledWith(
    expect.objectContaining({ uid: "student" }),
    "new-password",
  );
  expect(reauthenticateWithCredential.mock.invocationCallOrder[0]).toBeLessThan(
    updatePassword.mock.invocationCallOrder[0],
  );
});
it("does not change a password when the current password check fails", async () => {
  reauthenticateWithCredential.mockRejectedValueOnce(
    new Error("Wrong current password"),
  );
  await expect(changePassword("wrong", "new-password")).rejects.toThrow(
    "Wrong current password",
  );
  expect(updatePassword).not.toHaveBeenCalled();
});
it("marks only visible connected sessions online and removes presence before logout", async () => {
  let connection;
  const stopListener = vi.fn();
  onValue.mockImplementation((_path, callback) => {
    connection = callback;
    return stopListener;
  });
  const disconnectRemove = vi.fn(async () => {});
  onDisconnect.mockReturnValue({ remove: disconnectRemove });
  set.mockResolvedValue();
  remove.mockResolvedValue();
  let hidden = false;
  const descriptor = Object.getOwnPropertyDescriptor(document, "hidden");
  Object.defineProperty(document, "hidden", {
    configurable: true,
    get: () => hidden,
  });
  const stop = trackPresence("student");
  try {
    await connection({ val: () => true });
    const sessionPath = set.mock.calls.at(-1)[0];
    expect(sessionPath).toMatch(/^collegeChat\/presence\/student\/sessions\//);
    expect(set).toHaveBeenLastCalledWith(sessionPath, true);
    expect(disconnectRemove.mock.invocationCallOrder[0]).toBeLessThan(
      set.mock.invocationCallOrder[0],
    );
    hidden = true;
    document.dispatchEvent(new Event("visibilitychange"));
    expect(remove).toHaveBeenLastCalledWith(sessionPath);
    hidden = false;
    document.dispatchEvent(new Event("visibilitychange"));
    expect(set).toHaveBeenCalledTimes(2);
    window.dispatchEvent(new Event("pagehide"));
    expect(remove).toHaveBeenCalledTimes(2);
    await logout();
    expect(remove.mock.invocationCallOrder.at(-1)).toBeLessThan(
      signOut.mock.invocationCallOrder[0],
    );
    expect(stopListener).toHaveBeenCalledOnce();
    set.mockClear();
    document.dispatchEvent(new Event("visibilitychange"));
    expect(set).not.toHaveBeenCalled();
  } finally {
    await stop();
    if (descriptor) Object.defineProperty(document, "hidden", descriptor);
    else delete document.hidden;
  }
});
it("ignores stale legacy online flags and combines multiple visible sessions", () => {
  const listeners = {};
  onValue.mockImplementation((path, callback) => {
    listeners[path] = callback;
    return () => {};
  });
  const callback = vi.fn();
  const stop = watchDirectory(callback);
  listeners["collegeChat/presence"]({
    val: () => ({
      legacy: { online: true, lastSeen: 1 },
      student: { sessions: { first: true, second: true } },
      offline: { sessions: {} },
    }),
  });
  expect(callback.mock.calls.at(-1)[0].presence).toEqual({
    legacy: { online: false },
    student: { online: true },
    offline: { online: false },
  });
  listeners["collegeChat/presence"]({
    val: () => ({ student: { sessions: { second: true } } }),
  });
  expect(callback.mock.calls.at(-1)[0].presence.student.online).toBe(true);
  listeners["collegeChat/presence"]({ val: () => null });
  expect(callback.mock.calls.at(-1)[0].presence).toEqual({});
  stop();
});
it("does not publish a stopped session after disconnect cleanup finishes", async () => {
  let connection, arm;
  onValue.mockImplementation((_path, callback) => {
    connection = callback;
    return () => {};
  });
  onDisconnect.mockReturnValue({
    remove: () =>
      new Promise((resolve) => {
        arm = resolve;
      }),
  });
  remove.mockResolvedValue();
  const stop = trackPresence("student");
  const pending = connection({ val: () => true });
  await stop();
  arm();
  await pending;
  expect(set).not.toHaveBeenCalled();
});
