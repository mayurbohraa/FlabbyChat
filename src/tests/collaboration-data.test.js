import { it, expect } from "vitest";
import {
  validateBackup,
  makeBackup,
  taskCsv,
  notificationItems,
} from "../utils/collaboration-data.js";
it("accepts its own library and project export without exporting memberships", () => {
  const backup = makeBackup(
    { files: {}, folders: {} },
    {
      name: "Class project",
      owner: "private-owner",
      members: { private: true },
      tasks: {},
      workspaces: {},
    },
  );
  expect(validateBackup(JSON.stringify(backup)).format).toBe(
    "flabbychat-backup",
  );
  expect(JSON.stringify(backup)).not.toContain("private-owner");
});
it("rejects executable file URLs before importing any data", () => {
  const backup = {
    format: "flabbychat-backup",
    version: 1,
    library: {
      files: {
        bad: {
          id: "bad",
          name: "bad.pdf",
          url: "javascript:alert(1)",
          kind: "pdf",
          size: 1,
        },
      },
    },
  };
  expect(() => validateBackup(JSON.stringify(backup))).toThrow("invalid URL");
});
it("rejects invalid task state and oversized backups", () => {
  expect(() => validateBackup("x".repeat(8 * 1024 * 1024 + 1))).toThrow("8 MB");
  const data = {
    format: "flabbychat-backup",
    version: 1,
    project: {
      tasks: {
        a: {
          id: "a",
          title: "Work",
          status: "Unknown",
          due: "2026-11-01",
          priority: "Low",
        },
      },
    },
  };
  expect(() => validateBackup(JSON.stringify(data))).toThrow("invalid status");
});
it("escapes CSV formulas and quoted text", () => {
  const csv = taskCsv([
    { title: '=HYPERLINK("bad")', status: "To do", due: "2026-11-01" },
  ]);
  expect(csv).toContain("'=HYPERLINK");
  expect(csv).toContain('""bad""');
});
it("notifies only the receiver about call outcomes and the assignee about tasks", () => {
  const messages = {
    dm: {
      call: {
        id: "c",
        kind: "call",
        name: "Alice",
        createdAt: 1,
        call: { caller: "a", receiver: "b", outcome: "missed", video: false },
      },
    },
  };
  expect(notificationItems(messages, {}, "a")).toHaveLength(0);
  expect(notificationItems(messages, {}, "b")[0].detail).toBe("missed");
});
