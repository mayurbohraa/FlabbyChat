import { it, expect } from "vitest";
import {
  dateKey,
  fromKey,
  periodDates,
  shiftDate,
  callSummary,
} from "../utils/calendar.js";

it("builds complete local month and week periods including leap days", () => {
  expect(periodDates("2024-02-10", "Month")).toHaveLength(29);
  expect(periodDates("2026-11-01", "Week")).toEqual([
    "2026-11-01",
    "2026-11-02",
    "2026-11-03",
    "2026-11-04",
    "2026-11-05",
    "2026-11-06",
    "2026-11-07",
  ]);
  expect(dateKey(fromKey("2026-03-08"))).toBe("2026-03-08");
});

it("clamps month navigation and crosses years without skipping a month", () => {
  expect(shiftDate("2026-01-31", "Month", 1)).toBe("2026-02-28");
  expect(shiftDate("2026-12-15", "Month", 1)).toBe("2027-01-15");
  expect(shiftDate("2026-12-31", "Day", 1)).toBe("2027-01-01");
});

it("keeps call history short and includes attended duration", () => {
  expect(
    callSummary({ video: false, duration: 125, outcome: "completed" }),
  ).toBe("Voice call · 2:05");
  expect(callSummary({ video: true, duration: 0, outcome: "missed" })).toBe(
    "Video call · Missed",
  );
});
