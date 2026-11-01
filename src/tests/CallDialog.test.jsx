import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from "@testing-library/react";
import { beforeEach, afterEach, it, expect, vi } from "vitest";
import CallDialog from "../components/CallDialog.jsx";
let stateChanged, audio;
beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function () {};
  audio = { play: vi.fn(async () => {}), pause: vi.fn(), currentTime: 0 };
  vi.stubGlobal(
    "Audio",
    vi.fn(function () {
      return audio;
    }),
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
it("rings for an incoming call and stops when connecting", async () => {
  const session = {
    incoming: true,
    other: { name: "Student" },
    video: false,
    subscribe: (fn) => {
      stateChanged = fn;
      fn({ phase: "Incoming call" });
      return () => {};
    },
    listenForEnd: () => () => {},
    accept: vi.fn(() => stateChanged({ phase: "Connecting…" })),
    end: vi.fn(),
  };
  render(<CallDialog session={session} onClose={() => {}} />);
  await waitFor(() => expect(audio.play).toHaveBeenCalled());
  fireEvent.click(screen.getByRole("button", { name: "Accept" }));
  await waitFor(() => expect(audio.pause).toHaveBeenCalled());
});
it("declines an incoming call with an explicit outcome", async () => {
  const session = {
    incoming: true,
    other: { name: "Student" },
    subscribe: (fn) => {
      fn({ phase: "Incoming call" });
      return () => {};
    },
    listenForEnd: () => () => {},
    end: vi.fn(async () => {}),
  };
  render(
    <CallDialog session={session} onClose={() => {}} soundEnabled={false} />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Decline" }));
  await waitFor(() => expect(session.end).toHaveBeenCalledWith("Declined"));
  expect(audio.play).not.toHaveBeenCalled();
});
