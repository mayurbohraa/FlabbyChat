import { it, expect } from "vitest";
import { formatTime } from "../utils/time.js";

it("formats midnight, noon and afternoon in the chosen clock", () => {
  expect(formatTime("00:05", "24")).toBe("00:05");
  expect(formatTime("14:30", "24")).toBe("14:30");
  expect(formatTime("00:05", "12")).toMatch(/12:05.*am/i);
  expect(formatTime("12:05", "12")).toMatch(/12:05.*pm/i);
  expect(formatTime("14:30", "12")).toMatch(/02:30.*pm/i);
});
