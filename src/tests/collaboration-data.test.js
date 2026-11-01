import { it, expect } from "vitest";
import { taskCsv, notificationItems } from "../utils/collaboration-data.js";
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
  expect(notificationItems(messages, {}, "b")[0]).toMatchObject({
    title: "Missed call",
    detail: "Alice · Missed",
  });
});
it("uses the selected clock in upcoming event notifications", () => {
  const teams = {
    team: {
      id: "team",
      owner: "me",
      events: {
        event: {
          id: "event",
          title: "Review",
          date: "2099-11-02",
          time: "14:30",
          createdAt: 1,
        },
      },
    },
  };
  expect(notificationItems({}, teams, "me", {}, "12")[0].detail).toMatch(
    /02:30.*pm/i,
  );
  expect(notificationItems({}, teams, "me", {}, "24")[0].detail).toContain(
    "14:30",
  );
});
