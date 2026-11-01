import { beforeEach, afterEach, it, expect, vi } from "vitest";
import { createCall } from "../services/calls.js";

const state = vi.hoisted(() => ({ tree: {}, peer: null, track: null }));

vi.mock("../services/cloud.js", () => ({ db: {} }));

vi.mock("firebase/database", () => {
  const read = (path) =>
    path.split("/").reduce((node, key) => node?.[key], state.tree) ?? null;
  const write = (path, value) => {
    const parts = path.split("/");
    let node = state.tree;
    for (const key of parts.slice(0, -1)) node = node[key] || (node[key] = {});
    if (value === null) delete node[parts.at(-1)];
    else node[parts.at(-1)] = value;
  };
  return {
    ref: (_db, path) => path,
    set: vi.fn(async (path, value) => write(path, value)),
    update: vi.fn(async (path, value) =>
      write(path, { ...read(path), ...value }),
    ),
    remove: vi.fn(async (path) => write(path, null)),
    get: vi.fn(async (path) => ({ val: () => read(path) })),
    onValue: vi.fn((path, callback) => {
      callback({ val: () => read(path) });
      return () => {};
    }),
    runTransaction: vi.fn(async (path, fn) => {
      const next = fn(read(path));
      if (next !== undefined) write(path, next);
      return { snapshot: { val: () => read(path) } };
    }),
    onDisconnect: () => ({ update: async () => {}, cancel: async () => {} }),
    serverTimestamp: () => Date.now(),
  };
});

beforeEach(() => {
  state.tree = {};
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-01T14:00:00Z"));
  state.track = { stop: vi.fn(), enabled: true };
  vi.stubGlobal("navigator", {
    mediaDevices: {
      getUserMedia: vi.fn(async () => ({
        getTracks: () => [state.track],
        getAudioTracks: () => [state.track],
        getVideoTracks: () => [],
      })),
    },
  });
  vi.stubGlobal(
    "MediaStream",
    class {
      getTracks() {
        return [];
      }
      addTrack() {}
    },
  );
  vi.stubGlobal(
    "RTCPeerConnection",
    class {
      constructor() {
        state.peer = this;
      }
      addTrack() {}
      async createOffer() {
        return { type: "offer", sdp: "test-sdp" };
      }
      async setLocalDescription() {}
      close() {}
    },
  );
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

it("records one completed call with duration when both clients finish", async () => {
  const user = { id: "a", name: "Alice" },
    other = { id: "b", name: "Bob" };
  const outgoing = createCall({ user, other });
  await outgoing.start();
  state.peer.connectionState = "connected";
  state.peer.onconnectionstatechange();
  await Promise.resolve();
  vi.advanceTimersByTime(5000);
  await outgoing.end();
  const incoming = createCall({
    user: other,
    other: user,
    incoming: { id: outgoing.id },
  });
  await incoming.end();
  const records = state.tree.collegeChat.callHistory.a.b;
  expect(Object.keys(records)).toHaveLength(1);
  expect(records[outgoing.id]).toMatchObject({
    outcome: "completed",
    duration: 5,
  });
  expect(state.track.stop).toHaveBeenCalled();
});

it("records missed and declined calls separately", async () => {
  const user = { id: "a", name: "Alice" },
    other = { id: "b", name: "Bob" };
  const missed = createCall({ user, other });
  await missed.start();
  await missed.end("No answer");
  const declined = createCall({ user, other, video: true });
  await declined.start();
  const receiver = createCall({
    user: other,
    other: user,
    video: true,
    incoming: { id: declined.id },
  });
  await receiver.end("Declined");
  expect(state.tree.collegeChat.callHistory.a.b[missed.id].outcome).toBe(
    "missed",
  );
  expect(state.tree.collegeChat.callHistory.a.b[declined.id]).toMatchObject({
    video: true,
    outcome: "declined",
  });
  await declined.end();
});

it("preserves mute when selected before microphone permission completes", async () => {
  const call = createCall({
    user: { id: "a", name: "Alice" },
    other: { id: "b", name: "Bob" },
  });
  call.mute(true);
  await call.start();
  expect(state.track.enabled).toBe(false);
  await call.end();
});
