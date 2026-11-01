import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
  within,
  act,
} from "@testing-library/react";
import { afterEach, beforeEach, it, expect, vi } from "vitest";
import App from "../App.jsx";
import Auth from "../components/Auth.jsx";
import * as cloud from "../services/cloud.js";
import * as storage from "../services/storage.js";
vi.mock("../services/cloud.js", () => ({
  configured: false,
  watchAuth: () => () => {},
  login: vi.fn(),
  signup: vi.fn(),
}));
vi.mock("../services/calls.js", () => ({
  watchIncoming: () => () => {},
  createCall: vi.fn(),
}));
beforeEach(() => {
  localStorage.clear();
  HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function () {
    this.open = false;
  };
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
function demo() {
  render(<App />);
  fireEvent.click(
    screen.getByRole("button", { name: "Try demo without an account" }),
  );
  fireEvent.click(
    within(
      screen.getByRole("navigation", { name: "Main navigation" }),
    ).getByRole("button", { name: "Chat", exact: true }),
  );
}
it("opens on login and provides a separate signup form", () => {
  render(<App />);
  expect(
    screen.getByRole("heading", { name: "Login to your account" }),
  ).toBeInTheDocument();
  expect(screen.getAllByRole("button", { name: "Sign up" })).toHaveLength(1);
  fireEvent.click(screen.getByRole("button", { name: "Sign up" }));
  expect(screen.getByLabelText("Full name")).toBeInTheDocument();
  expect(screen.getByLabelText("Confirm password")).toBeInTheDocument();
  expect(screen.queryByText("Tasks")).not.toBeInTheDocument();
  expect(screen.queryByText(/College chat project/)).not.toBeInTheDocument();
});
it("shows mismatched passwords without creating an account", () => {
  render(<Auth onDemo={() => {}} />);
  fireEvent.click(screen.getByRole("button", { name: "Sign up" }));
  fireEvent.change(screen.getByLabelText("Full name"), {
    target: { value: "Test Student" },
  });
  fireEvent.change(screen.getByLabelText("Email address"), {
    target: { value: "student@example.com" },
  });
  fireEvent.change(screen.getByLabelText("Password"), {
    target: { value: "password123" },
  });
  fireEvent.change(screen.getByLabelText("Confirm password"), {
    target: { value: "different" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Sign up" }));
  expect(screen.getByRole("alert")).toHaveTextContent("passwords do not match");
  expect(cloud.signup).not.toHaveBeenCalled();
});
it("saves a sent message across reloads", async () => {
  demo();
  fireEvent.change(screen.getByLabelText("Message"), {
    target: { value: "Please check the project report" },
  });
  fireEvent.click(screen.getByLabelText("Send message"));
  expect(
    await screen.findByText("Please check the project report"),
  ).toBeInTheDocument();
  cleanup();
  demo();
  expect(
    await screen.findByText("Please check the project report"),
  ).toBeInTheDocument();
});
it("creates a channel and adds it to favorites", async () => {
  demo();
  fireEvent.click(screen.getByLabelText("Create channel"));
  fireEvent.change(screen.getByLabelText("Channel name"), {
    target: { value: "Lab group" },
  });
  fireEvent.change(screen.getByLabelText("Description"), {
    target: { value: "Our lab discussion" },
  });
  fireEvent.click(
    within(screen.getByRole("dialog", { name: "Create channel" })).getByRole(
      "button",
      { name: "Create channel" },
    ),
  );
  expect(
    await screen.findByRole("heading", { name: "# lab-group" }),
  ).toBeInTheDocument();
  fireEvent.click(screen.getByLabelText("Add to favorites"));
  await waitFor(() =>
    expect(screen.getByLabelText("Remove from favorites")).toBeInTheDocument(),
  );
});
it("keeps private messages out of a group channel", async () => {
  demo();
  fireEvent.click(
    screen.getByRole("button", { name: /^(Offline|Online) Hardik Maheshwari/ }),
  );
  fireEvent.change(screen.getByLabelText("Message"), {
    target: { value: "Private project note" },
  });
  fireEvent.click(screen.getByLabelText("Send message"));
  expect(await screen.findByText("Private project note")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "general" }));
  await waitFor(() =>
    expect(screen.queryByText("Private project note")).not.toBeInTheDocument(),
  );
});
it("attaches an image to a message", async () => {
  demo();
  fireEvent.change(screen.getByLabelText("Choose file"), {
    target: {
      files: [new File(["image data"], "sample.png", { type: "image/png" })],
    },
  });
  expect(await screen.findByAltText("Image to send")).toBeInTheDocument();
  fireEvent.click(screen.getByLabelText("Send message"));
  expect(await screen.findByAltText("sample.png")).toBeInTheDocument();
  expect(screen.queryByAltText("Image to send")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Preview sample.png" }));
  expect(
    within(screen.getByRole("dialog")).getByRole("img", { name: "sample.png" }),
  ).toBeInTheDocument();
  fireEvent.click(screen.getByLabelText("Close dialog"));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});
it("returns to the login screen after leaving demo", async () => {
  demo();
  fireEvent.click(screen.getByLabelText("Logout"));
  expect(
    await screen.findByRole("heading", { name: "Login to your account" }),
  ).toBeInTheDocument();
});
it("keeps the message draft when saving fails", async () => {
  demo();
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new Error("quota exceeded");
  });
  fireEvent.change(screen.getByLabelText("Message"), {
    target: { value: "Unsent message" },
  });
  fireEvent.click(screen.getByLabelText("Send message"));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Browser storage is full",
  );
  expect(screen.getByLabelText("Message")).toHaveValue("Unsent message");
});
it("sends a PDF as an in-app preview attachment", async () => {
  demo();
  fireEvent.change(screen.getByLabelText("Choose file"), {
    target: {
      files: [
        new File(["%PDF test"], "project.pdf", { type: "application/pdf" }),
      ],
    },
  });
  expect(await screen.findByText("project.pdf")).toBeInTheDocument();
  fireEvent.click(screen.getByLabelText("Send message"));
  expect(
    await screen.findByRole("button", { name: "Preview project.pdf" }),
  ).toBeInTheDocument();
  expect(
    screen.queryByRole("link", { name: /project.pdf/ }),
  ).not.toBeInTheDocument();
});
it("restores each chat’s text and attachment draft separately", async () => {
  demo();
  fireEvent.change(screen.getByLabelText("Message"), {
    target: { value: "Report for the group" },
  });
  fireEvent.change(screen.getByLabelText("Choose file"), {
    target: {
      files: [
        new File(["%PDF group"], "group.pdf", { type: "application/pdf" }),
      ],
    },
  });
  expect(await screen.findByText("group.pdf")).toBeInTheDocument();
  fireEvent.click(
    screen.getByRole("button", { name: /^(Offline|Online) Hardik Maheshwari/ }),
  );
  expect(screen.getByLabelText("Message")).toHaveValue("");
  expect(screen.queryByText("group.pdf")).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Message"), {
    target: { value: "A private note" },
  });
  fireEvent.click(screen.getByRole("button", { name: "general" }));
  expect(screen.getByLabelText("Message")).toHaveValue("Report for the group");
  expect(screen.getByText("group.pdf")).toBeInTheDocument();
  fireEvent.click(screen.getByLabelText("Send message"));
  expect(
    await screen.findByRole("button", { name: "Preview group.pdf" }),
  ).toBeInTheDocument();
  fireEvent.click(
    screen.getByRole("button", { name: /^(Offline|Online) Hardik Maheshwari/ }),
  );
  expect(screen.getByLabelText("Message")).toHaveValue("A private note");
  expect(screen.queryByText("group.pdf")).not.toBeInTheDocument();
  cleanup();
  demo();
  expect(
    await screen.findByRole("button", { name: "Preview group.pdf" }),
  ).toBeInTheDocument();
});
it("keeps an upload in its originating chat when conversations change", async () => {
  let completeUpload;
  vi.spyOn(storage, "prepareAttachment").mockImplementation(
    () =>
      new Promise((resolve) => {
        completeUpload = resolve;
      }),
  );
  demo();
  fireEvent.change(screen.getByLabelText("Choose file"), {
    target: {
      files: [
        new File(["%PDF test"], "original.pdf", { type: "application/pdf" }),
      ],
    },
  });
  fireEvent.click(
    screen.getByRole("button", { name: /^(Offline|Online) Hardik Maheshwari/ }),
  );
  await act(async () =>
    completeUpload({
      name: "original.pdf",
      kind: "pdf",
      url: "data:application/pdf;base64,JVBERg==",
      size: 10,
    }),
  );
  expect(screen.queryByText("original.pdf")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "general" }));
  expect(await screen.findByText("original.pdf")).toBeInTheDocument();
});
