import React from "react";
import {
  render,
  screen,
  fireEvent,
  cleanup,
  within,
} from "@testing-library/react";
import { afterEach, it, expect, vi } from "vitest";
import Dashboard from "../components/Dashboard.jsx";

afterEach(cleanup);

const props = () => ({
  user: { id: "me", name: "Student" },
  users: {},
  library: { files: {} },
  onNavigate: vi.fn(),
  onTeam: vi.fn(),
  onCalendar: vi.fn(),
});

it("shows real status proportions and completed tasks by team", () => {
  const callbacks = props();
  const teams = {
    a: {
      id: "a",
      name: "Alpha",
      members: {},
      tasks: {
        one: { id: "one", status: "Done" },
        two: { id: "two", status: "To do" },
      },
    },
    b: {
      id: "b",
      name: "Beta",
      members: {},
      tasks: {
        three: { id: "three", status: "In progress" },
      },
    },
  };
  render(<Dashboard {...callbacks} teams={teams} />);
  const chart = screen.getByRole("img", {
    name: "To do: 1, In progress: 1, Done: 1",
  });
  expect(within(chart).getByText("33%")).toBeInTheDocument();
  expect(
    screen.getByRole("img", { name: "Alpha: 1 completed of 2 tasks" }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("img", { name: "Beta: 0 completed of 1 tasks" }),
  ).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Open Alpha team" }));
  expect(callbacks.onTeam).toHaveBeenCalledWith("a");
});

it("shows an honest empty state without inventing chart data", () => {
  render(<Dashboard {...props()} teams={{}} />);
  expect(
    screen.getByText("Create a task to start tracking progress."),
  ).toBeInTheDocument();
  expect(screen.queryByRole("img", { name: /To do:/ })).not.toBeInTheDocument();
});
