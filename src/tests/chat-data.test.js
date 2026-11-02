import { beforeEach, describe, it, expect } from "vitest";
import {
  loadDemo,
  saveDemo,
  conversationId,
  filterMessages,
  unreadCount,
  validateSignup,
  friendlyError,
} from "../utils/chat-data.js";

beforeEach(() => localStorage.clear());

describe("chat helpers", () => {
  it("stores and restores messages", () => {
    const data = loadDemo();
    data.messages.test = { id: "test", text: "Project update", createdAt: 1 };
    saveDemo(data);
    expect(loadDemo().messages.test.text).toBe("Project update");
  });
  it("uses the same private chat for both users", () =>
    expect(conversationId("a", "b")).toBe(conversationId("b", "a")));
  it("searches text and names literally, including brackets", () => {
    const messages = {
      a: { text: "Review [draft]", name: "Ethan", createdAt: 2 },
      b: { text: "Hello", name: "Olivia", createdAt: 1 },
    };
    expect(filterMessages(messages, "[")).toHaveLength(1);
    expect(filterMessages(messages, "OLIVIA")[0].text).toBe("Hello");
  });
  it("counts unread messages from other users only", () => {
    expect(
      unreadCount(
        {
          a: { userId: "other", createdAt: 3 },
          b: { userId: "me", createdAt: 4 },
          c: { userId: "other", createdAt: 1 },
        },
        2,
        "me",
      ),
    ).toBe(1);
  });
  it("validates signup confirmation and password length", () => {
    expect(validateSignup("Alex", "12345678", "different")).toContain("match");
    expect(validateSignup("Alex", "short", "short")).toContain("8 characters");
    expect(validateSignup("Alex", "password123", "password123")).toBe("");
  });
  it("explains authentication errors", () =>
    expect(friendlyError({ code: "auth/invalid-credential" })).toBe(
      "Incorrect email or password.",
    ));
});
