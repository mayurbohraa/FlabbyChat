import { beforeEach, expect, it } from "vitest";
import {
  demoUser,
  loadDemo,
  saveDemo,
  sampleChat,
  conversationId,
} from "../utils/chat-data.js";
import { dateKey } from "../utils/calendar.js";
import { safeAttachmentUrl } from "../services/storage.js";

beforeEach(() => localStorage.clear());

it("seeds fictional people and connected work for every demo section", () => {
  const data = sampleChat();
  expect(demoUser.name).toBe("Alex Morgan");
  expect(demoUser.email).toBe("alex@example.com");
  expect(Object.values(data.users).map((user) => user.name)).toEqual([
    "Alex Morgan",
    "Ethan Brooks",
    "Olivia Parker",
    "Sophie Bennett",
  ]);
  const teams = Object.values(data.teams);
  expect(teams).toHaveLength(2);
  expect(teams.some((team) => team.owner === demoUser.id)).toBe(true);
  expect(teams.some((team) => team.owner !== demoUser.id)).toBe(true);
  const statuses = new Set();
  for (const team of teams) {
    expect(team.members[demoUser.id]).toBeDefined();
    expect(Object.keys(team.workspaces).length).toBeGreaterThan(0);
    expect(Object.keys(team.topics).length).toBeGreaterThan(0);
    expect(Object.keys(team.files).length).toBeGreaterThan(0);
    for (const member of Object.values(team.members))
      expect(data.users[member.id]).toBeDefined();
    for (const task of Object.values(team.tasks)) {
      statuses.add(task.status);
      expect(team.workspaces[task.workspaceId]).toBeDefined();
      expect(team.members[task.assignee]).toBeDefined();
    }
    for (const event of Object.values(team.events)) {
      expect(event.date >= dateKey(new Date())).toBe(true);
      expect(team.workspaces[event.workspaceId]).toBeDefined();
    }
  }
  expect(statuses).toEqual(new Set(["To do", "In progress", "Done"]));
  expect(Object.keys(data.library.files).length).toBeGreaterThan(0);
  expect(
    Object.values(data.messages).some((message) => message.kind === "call"),
  ).toBe(true);
  for (const message of Object.values(data.messages)) {
    expect(data.users[message.userId]).toBeDefined();
    if (message.recipient)
      expect(message.channel).toBe(
        conversationId(message.userId, message.recipient),
      );
    else expect(data.channels[message.channel]).toBeDefined();
  }
});

it("provides self-contained PDF files with valid cross-reference offsets", () => {
  const data = sampleChat();
  const libraries = [data.library, ...Object.values(data.teams)];
  for (const library of libraries) {
    for (const file of Object.values(library.files)) {
      expect(library.folders[file.folderId]).toBeDefined();
      expect(safeAttachmentUrl(file.url)).toBe(file.url);
      if (file.kind === "image") {
        expect(file.url).toMatch(/^data:image\/png;base64,/);
        expect(atob(file.url.split(",")[1]).slice(1, 4)).toBe("PNG");
        continue;
      }
      const pdf = atob(file.url.split(",")[1]);
      expect(pdf.startsWith("%PDF-1.4")).toBe(true);
      expect(file.size).toBe(pdf.length);
      expect(file.size).toBeLessThan(250 * 1024);
      const xref = Number(pdf.match(/startxref\n(\d+)/)[1]);
      expect(pdf.slice(xref, xref + 4)).toBe("xref");
      const offsets = [...pdf.matchAll(/(\d{10}) 00000 n/g)];
      offsets.forEach((match, index) =>
        expect(pdf.slice(Number(match[1]))).toMatch(
          new RegExp(`^${index + 1} 0 obj`),
        ),
      );
    }
  }
});

it("isolates the new guest data from old samples and preserves guest edits on reload", () => {
  const legacy = JSON.stringify({ users: { old: { name: "Old guest" } } });
  localStorage.setItem("flabbychat.simple-demo.v1", legacy);
  const data = loadDemo();
  expect(data.users.alex.name).toBe("Alex Morgan");
  expect(data.users.old).toBeUndefined();
  data.teams.harbor.name = "My demo edits";
  saveDemo(data);
  expect(loadDemo().teams.harbor.name).toBe("My demo edits");
  expect(loadDemo().teams.harbor.createdAt).toBe(data.teams.harbor.createdAt);
  expect(localStorage.getItem("flabbychat.simple-demo.v1")).toBe(legacy);
});
