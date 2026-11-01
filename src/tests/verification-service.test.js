import { beforeEach, it, expect, vi } from "vitest";
import {
  sendVerification,
  refreshVerification,
  signup,
  ensureProfile,
  resetPassword,
  changePassword,
} from "../services/cloud.js";
import {
  sendEmailVerification,
  reload,
  getIdToken,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  reauthenticateWithCredential,
  updatePassword,
} from "firebase/auth";
import { set, runTransaction } from "firebase/database";
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
