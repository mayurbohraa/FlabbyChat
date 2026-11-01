import { it, expect, vi } from "vitest";
import {
  sendMessage,
  watchMessages,
  transferLibraryFile,
} from "../services/cloud.js";
import { set, onValue, update } from "firebase/database";
vi.mock("firebase/app", () => ({ initializeApp: () => ({}) }));
vi.mock("firebase/auth", () => ({ getAuth: () => ({}) }));
vi.mock("firebase/database", () => ({
  getDatabase: () => null,
  ref: (_db, path) => path,
  set: vi.fn(),
  onValue: vi.fn(() => () => {}),
  update: vi.fn(),
  remove: vi.fn(),
  onDisconnect: vi.fn(),
  runTransaction: vi.fn(),
  serverTimestamp: vi.fn(),
}));
it("stores text and attachment together under their group channel", () => {
  const message = {
    id: "message-1",
    channel: "project",
    userId: "student-a",
    name: "Student",
    text: "Project report",
    createdAt: 123,
    attachment: {
      name: "report.pdf",
      url: "https://res.cloudinary.com/cze8a37x/image/upload/report.pdf",
      kind: "pdf",
      size: 100,
    },
  };
  sendMessage(message);
  expect(set).toHaveBeenLastCalledWith(
    "collegeChat/messages/project/message-1",
    message,
  );
  watchMessages(
    "project",
    "student-a",
    undefined,
    () => {},
    () => {},
  );
  expect(onValue.mock.calls.at(-1)[0]).toBe("collegeChat/messages/project");
});
it("stores and reads a private attachment only at the participants’ conversation path", () => {
  const message = {
    id: "private-1",
    channel: "dm-a--b",
    userId: "b",
    recipient: "a",
    text: "Private report",
    attachment: { name: "report.pdf" },
    createdAt: 123,
  };
  sendMessage(message);
  expect(set).toHaveBeenLastCalledWith(
    "collegeChat/direct/a/b/private-1",
    message,
  );
  watchMessages(
    "dm-a--b",
    "a",
    "b",
    () => {},
    () => {},
  );
  expect(onValue.mock.calls.map((call) => call[0])).toContain(
    "collegeChat/direct/a/b",
  );
  expect(onValue.mock.calls.map((call) => call[0])).toContain(
    "collegeChat/callHistory/a/b",
  );
});

it("moves cross-library metadata in one atomic update and propagates rejected writes", async () => {
  const file = {
    id: "new-file",
    name: "report.pdf",
    url: "https://res.cloudinary.com/demo/report.pdf",
  };
  update.mockResolvedValueOnce();
  await transferLibraryFile("student", null, "team", "old-file", file, true);
  expect(update).toHaveBeenLastCalledWith("collegeChat/", {
    "libraries/student/files/old-file": null,
    "teams/team/files/new-file": file,
  });
  update.mockRejectedValueOnce(new Error("Permission denied"));
  await expect(
    transferLibraryFile("student", "team", null, "old-file", file, true),
  ).rejects.toThrow("Permission denied");
  update.mockResolvedValueOnce();
  await transferLibraryFile("student", null, "team", "old-file", file, false);
  expect(update).toHaveBeenLastCalledWith("collegeChat/", {
    "teams/team/files/new-file": file,
  });
});
