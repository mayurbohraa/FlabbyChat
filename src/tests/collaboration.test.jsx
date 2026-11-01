import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
  cleanup,
} from "@testing-library/react";
import { beforeEach, afterEach, it, expect, vi } from "vitest";
import Chat from "../components/Chat.jsx";
import FileTransferDialog from "../components/FileTransferDialog.jsx";
import Profile from "../components/Profile.jsx";
import NotificationDropdown from "../components/NotificationDropdown.jsx";
import * as cloud from "../services/cloud.js";
import { demoUser, loadDemo, saveDemo } from "../utils/chat-data.js";
vi.mock("../services/cloud.js", () => ({
  configured: false,
  saveProfile: vi.fn(),
  changePassword: vi.fn(),
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
afterEach(cleanup);
function start() {
  render(<Chat user={demoUser} demo onLogout={() => {}} />);
}
function nav(name) {
  fireEvent.click(
    within(
      screen.getByRole("navigation", { name: "Main navigation" }),
    ).getByRole("button", {
      name:
        {
          Workspaces: "Projects",
          Discussions: "Board",
          Storage: "Files",
          Notifications: "Alerts",
        }[name] || name,
    }),
  );
}
async function team() {
  nav("Teams");
  fireEvent.click(screen.getByRole("button", { name: "Create team" }));
  fireEvent.change(screen.getByLabelText("Name"), {
    target: { value: "College group" },
  });
  fireEvent.click(
    within(screen.getByRole("dialog")).getByRole("button", { name: "Create" }),
  );
  await waitFor(() =>
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
  );
}
it("creates a team, assigns a task, and persists status changes", async () => {
  start();
  await team();
  nav("Tasks");
  fireEvent.click(screen.getByRole("button", { name: "New task" }));
  fireEvent.change(screen.getByLabelText("Title"), {
    target: { value: "Finish the report" },
  });
  fireEvent.click(
    within(screen.getByRole("dialog")).getByRole("button", { name: "Create" }),
  );
  expect(await screen.findByText("Finish the report")).toBeInTheDocument();
  fireEvent.click(screen.getByText("Finish the report"));
  fireEvent.change(screen.getByLabelText("Status for Finish the report"), {
    target: { value: "Done" },
  });
  await waitFor(() =>
    expect(
      Object.values(Object.values(loadDemo().teams)[0].tasks)[0].status,
    ).toBe("Done"),
  );
});
it("adds a registered user to a team", async () => {
  start();
  await team();
  fireEvent.click(screen.getByRole("button", { name: "Add registered user" }));
  fireEvent.change(screen.getByLabelText("Registered user"), {
    target: { value: "hardik" },
  });
  fireEvent.click(
    within(screen.getByRole("dialog")).getByRole("button", { name: "Create" }),
  );
  await waitFor(() =>
    expect(Object.values(loadDemo().teams)[0].members.hardik.name).toBe(
      "Hardik Maheshwari",
    ),
  );
});
it("keeps discussion replies in their topic", async () => {
  start();
  await team();
  nav("Discussions");
  fireEvent.click(screen.getByRole("button", { name: "New post" }));
  fireEvent.change(screen.getByLabelText("Title"), {
    target: { value: "Project review" },
  });
  fireEvent.change(screen.getByLabelText("Discussion"), {
    target: { value: "Review our implementation." },
  });
  fireEvent.click(
    within(screen.getByRole("dialog")).getByRole("button", { name: "Create" }),
  );
  expect(await screen.findByText("Project review")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /^Project review/ }));
  fireEvent.click(screen.getByRole("button", { name: "Write a reply" }));
  fireEvent.change(screen.getByLabelText("Your reply"), {
    target: { value: "I will check the tests." },
  });
  fireEvent.click(
    within(screen.getByRole("dialog")).getByRole("button", { name: "Create" }),
  );
  expect(
    await screen.findByText("I will check the tests."),
  ).toBeInTheDocument();
});
it("uploads to a personal library and explicitly shares the file into a chosen conversation", async () => {
  start();
  nav("Storage");
  fireEvent.change(screen.getByLabelText("Upload library file"), {
    target: {
      files: [
        new File(["%PDF test"], "notes.pdf", { type: "application/pdf" }),
      ],
    },
  });
  expect(await screen.findByText("notes.pdf")).toBeInTheDocument();
  fireEvent.click(screen.getByLabelText("Share notes.pdf"));
  fireEvent.change(screen.getByLabelText("Conversation"), {
    target: { value: "dm-hardik--mayur" },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Attach to conversation" }),
  );
  expect(screen.getByLabelText("Message")).toHaveValue("");
  expect(screen.getByText("notes.pdf")).toBeInTheDocument();
  fireEvent.click(screen.getByLabelText("Send message"));
  expect(
    await screen.findByRole("button", { name: "Preview notes.pdf" }),
  ).toBeInTheDocument();
  expect(
    Object.values(loadDemo().messages).find((m) => m.attachment)?.recipient,
  ).toBe("hardik");
});
it("favorites a private chat and displays the email in the sidebar", async () => {
  start();
  expect(screen.getByText("mayur@example.com")).toBeInTheDocument();
  nav("Chat");
  fireEvent.click(screen.getByLabelText("Favorite Hardik Maheshwari"));
  await waitFor(() =>
    expect(loadDemo().preferences.favorites["dm-hardik--mayur"]).toBe(true),
  );
  expect(
    screen.getAllByRole("button", { name: /^(Offline|Online) Hardik/ }),
  ).toHaveLength(2);
});
it("updates profile details and the selected theme", async () => {
  start();
  fireEvent.click(screen.getByLabelText("Edit profile"));
  fireEvent.change(screen.getByLabelText("Name"), {
    target: { value: "Mayur B" },
  });
  fireEvent.change(screen.getByLabelText("About you"), {
    target: { value: "College developer" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save profile" }));
  await waitFor(() =>
    expect(loadDemo().users.mayur.bio).toBe("College developer"),
  );
  nav("Settings");
  fireEvent.change(screen.getByLabelText("Theme"), {
    target: { value: "dark" },
  });
  await waitFor(() =>
    expect(document.documentElement.dataset.theme).toBe("dark"),
  );
});
it("schedules an event in the selected project", async () => {
  start();
  await team();
  nav("Calendar");
  fireEvent.click(screen.getByRole("button", { name: "New event" }));
  fireEvent.change(screen.getByLabelText("Title"), {
    target: { value: "Final review" },
  });
  fireEvent.click(
    within(screen.getByRole("dialog")).getByRole("button", { name: "Create" }),
  );
  await waitFor(() =>
    expect(
      Object.values(Object.values(loadDemo().teams)[0].events)[0].title,
    ).toBe("Final review"),
  );
});

it("opens on the dashboard and keeps sidebar navigation flat", () => {
  start();
  expect(
    within(screen.getByRole("main")).getByRole("heading", {
      name: "Dashboard",
      level: 1,
    }),
  ).toBeInTheDocument();
  expect(
    screen.getByText("Your chats and projects at a glance."),
  ).toBeInTheDocument();
  nav("Tasks");
  const taskLink = within(
    screen.getByRole("navigation", { name: "Main navigation" }),
  ).getByRole("button", { name: "Tasks" });
  expect(taskLink).not.toHaveAttribute("aria-expanded");
  expect(screen.getByLabelText("Selected team")).toBeInTheDocument();
});
it("uses a header search and notifications while keeping chat navigation in the chat area", async () => {
  start();
  const navigation = screen.getByRole("navigation", {
    name: "Main navigation",
  });
  expect(
    within(navigation).queryByRole("button", { name: "Alerts" }),
  ).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Search app"), {
    target: { value: "Hardik" },
  });
  const results = screen.getByRole("region", { name: "Search results" });
  fireEvent.click(
    within(results).getByRole("button", { name: /Hardik Maheshwari/ }),
  );
  expect(
    screen.getByRole("heading", { name: "Hardik Maheshwari" }),
  ).toBeInTheDocument();
  expect(
    within(navigation).queryByRole("button", { name: "general" }),
  ).not.toBeInTheDocument();
  expect(
    within(screen.getByRole("complementary", { name: "Chat list" })).getByRole(
      "button",
      { name: /^general(?: |$)/ },
    ),
  ).toBeInTheDocument();
  fireEvent.click(screen.getByLabelText("Notifications"));
  expect(
    screen.getByRole("region", { name: "Notifications" }),
  ).toBeInTheDocument();
});

it("opens mobile search below the header and dismisses it with Escape or a result", () => {
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
  try {
    start();
    expect(screen.queryByLabelText("Search app")).not.toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Open search"));
    expect(screen.getByLabelText("Search app")).toHaveFocus();
    fireEvent.keyDown(screen.getByLabelText("Search app"), { key: "Escape" });
    expect(screen.queryByLabelText("Search app")).not.toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Open search"));
    fireEvent.change(screen.getByLabelText("Search app"), {
      target: { value: "Hardik" },
    });
    fireEvent.click(
      within(screen.getByRole("region", { name: "Search results" })).getByRole(
        "button",
        { name: /Hardik Maheshwari/ },
      ),
    );
    expect(screen.queryByLabelText("Search app")).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Hardik Maheshwari" }),
    ).toBeInTheDocument();
  } finally {
    cleanup();
    vi.unstubAllGlobals();
  }
});
it("keeps notifications in a dismissible popup without replacing the current page", () => {
  start();
  fireEvent.click(screen.getByLabelText("Notifications"));
  expect(
    screen.getByRole("region", { name: "Notifications" }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("heading", { name: "Dashboard", level: 1 }),
  ).toBeInTheDocument();
  fireEvent.keyDown(document, { key: "Escape" });
  expect(
    screen.queryByRole("region", { name: "Notifications" }),
  ).not.toBeInTheDocument();
  fireEvent.click(screen.getByLabelText("Notifications"));
  fireEvent.pointerDown(screen.getByRole("main"));
  expect(
    screen.queryByRole("region", { name: "Notifications" }),
  ).not.toBeInTheDocument();
});

it("hides calling controls in channels and demo private chats", () => {
  start();
  nav("Chat");
  expect(
    screen.queryByRole("button", { name: "Voice call" }),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "Video call" }),
  ).not.toBeInTheDocument();
  fireEvent.click(
    screen.getByRole("button", { name: /^(Offline|Online) Hardik Maheshwari/ }),
  );
  expect(
    screen.queryByRole("button", { name: "Voice call" }),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "Video call" }),
  ).not.toBeInTheDocument();
  fireEvent.click(screen.getByLabelText("Edit profile"));
  expect(
    within(
      screen.getByRole("navigation", { name: "Profile sections" }),
    ).queryByRole("button", { name: "Password" }),
  ).not.toBeInTheDocument();
});

it("shows a password mismatch beside its field without changing the account", () => {
  render(
    <Profile
      user={demoUser}
      demo={false}
      onSave={vi.fn()}
      onNotice={vi.fn()}
    />,
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Password", exact: true }),
  );
  fireEvent.change(screen.getByLabelText("Current password"), {
    target: { value: "current-example" },
  });
  fireEvent.change(screen.getByLabelText("New password"), {
    target: { value: "new-example-123" },
  });
  fireEvent.change(screen.getByLabelText("Confirm new password"), {
    target: { value: "different-example" },
  });
  fireEvent.submit(
    screen.getByRole("button", { name: "Update password" }).closest("form"),
  );
  expect(screen.getByLabelText("Confirm new password")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  expect(screen.getByRole("alert")).toHaveTextContent(
    "The new passwords do not match.",
  );
  expect(cloud.changePassword).not.toHaveBeenCalled();
});

it("keeps a failed notification action in its popup and allows retry", async () => {
  const onRead = vi
    .fn()
    .mockRejectedValueOnce(new Error("Connection lost. Try again."))
    .mockResolvedValueOnce();
  const onOpen = vi.fn();
  render(
    <NotificationDropdown
      notifications={[
        {
          id: "n1",
          title: "New message",
          detail: "Hello",
          createdAt: 1,
          chat: "general",
        },
      ]}
      preferences={{}}
      onRead={onRead}
      onOpen={onOpen}
      onClose={vi.fn()}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: /New message Hello/ }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Connection lost. Try again.",
  );
  expect(onOpen).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: /New message Hello/ }));
  await waitFor(() => expect(onOpen).toHaveBeenCalledTimes(1));
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});

it("pauses and restores a member's team access from the member menu", async () => {
  start();
  await team();
  fireEvent.click(screen.getByRole("button", { name: "Add registered user" }));
  fireEvent.change(screen.getByLabelText("Registered user"), {
    target: { value: "hardik" },
  });
  fireEvent.click(
    within(screen.getByRole("dialog")).getByRole("button", { name: "Create" }),
  );
  await waitFor(() =>
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
  );
  fireEvent.click(
    screen.getByLabelText("Member options for Hardik Maheshwari"),
  );
  fireEvent.click(screen.getByRole("menuitem", { name: "Pause access" }));
  await waitFor(() =>
    expect(Object.values(loadDemo().teams)[0].members.hardik.status).toBe(
      "on hold",
    ),
  );
  fireEvent.click(
    screen.getByLabelText("Member options for Hardik Maheshwari"),
  );
  fireEvent.click(screen.getByRole("menuitem", { name: "Restore access" }));
  await waitFor(() =>
    expect(Object.values(loadDemo().teams)[0].members.hardik.status).toBe(
      "active",
    ),
  );
});
it("copies and moves file references without overwriting the original", async () => {
  const data = loadDemo();
  data.library = {
    folders: { reports: { id: "reports", name: "Reports", createdAt: 1 } },
    files: {
      original: {
        id: "original",
        name: "report.pdf",
        kind: "pdf",
        url: "data:application/pdf;base64,JVBERi0xLjQ=",
        size: 9,
        createdAt: 1,
        createdBy: "mayur",
        folderId: "",
      },
    },
  };
  saveDemo(data);
  start();
  nav("Storage");
  fireEvent.click(screen.getByLabelText("File options for report.pdf"));
  fireEvent.click(screen.getByRole("menuitem", { name: "Make a copy" }));
  await waitFor(() =>
    expect(Object.keys(loadDemo().library.files)).toHaveLength(2),
  );
  fireEvent.click(screen.getByLabelText("File options for report.pdf"));
  fireEvent.click(screen.getByRole("menuitem", { name: "Copy to…" }));
  fireEvent.click(screen.getByRole("radio", { name: /Reports/ }));
  fireEvent.click(screen.getByRole("button", { name: "Copy here" }));
  await waitFor(() =>
    expect(Object.keys(loadDemo().library.files)).toHaveLength(3),
  );
  expect(
    Object.values(loadDemo().library.files).some(
      (f) => f.folderId === "reports" && f.id !== "original",
    ),
  ).toBe(true);
  fireEvent.click(screen.getByLabelText("File options for report.pdf"));
  fireEvent.click(screen.getByRole("menuitem", { name: "Move to…" }));
  fireEvent.click(screen.getByRole("radio", { name: /Reports/ }));
  fireEvent.click(screen.getByRole("button", { name: "Move here" }));
  await waitFor(() =>
    expect(loadDemo().library.files.original.folderId).toBe("reports"),
  );
  expect(loadDemo().library.files.original.url).toBe(
    data.library.files.original.url,
  );
  expect(Object.keys(loadDemo().library.files)).toHaveLength(3);
});
it("offers day, week, month and year calendar views", async () => {
  start();
  await team();
  nav("Calendar");
  fireEvent.click(screen.getByRole("button", { name: "Year", exact: true }));
  expect(screen.getByText(/January/)).toBeInTheDocument();
  expect(screen.getByText(/December/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Day", exact: true }));
  expect(screen.getByText("No events on this day.")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Week", exact: true }));
  expect(screen.getAllByRole("button", { name: /Add event on/ })).toHaveLength(
    7,
  );
  fireEvent.click(screen.getByRole("button", { name: "Month", exact: true }));
  expect(
    screen.getAllByRole("button", { name: /Add event on/ }).length,
  ).toBeGreaterThanOrEqual(28);
});

it("confirms ownership transfer and removes owner actions from the previous owner", async () => {
  start();
  await team();
  fireEvent.click(screen.getByRole("button", { name: "Add registered user" }));
  fireEvent.change(screen.getByLabelText("Registered user"), {
    target: { value: "hardik" },
  });
  fireEvent.click(
    within(screen.getByRole("dialog")).getByRole("button", { name: "Create" }),
  );
  await waitFor(() =>
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
  );
  fireEvent.click(
    screen.getByLabelText("Member options for Hardik Maheshwari"),
  );
  fireEvent.click(screen.getByRole("menuitem", { name: "Transfer ownership" }));
  expect(screen.getByRole("dialog")).toHaveTextContent(
    "You will remain a member",
  );
  expect(Object.values(loadDemo().teams)[0].owner).toBe("mayur");
  fireEvent.click(
    within(screen.getByRole("dialog")).getByRole("button", {
      name: "Transfer ownership",
    }),
  );
  await waitFor(() =>
    expect(Object.values(loadDemo().teams)[0].owner).toBe("hardik"),
  );
  expect(Object.values(loadDemo().teams)[0].members.mayur).toBeDefined();
  expect(
    screen.queryByRole("button", { name: "Add registered user" }),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByLabelText("Member options for Hardik Maheshwari"),
  ).not.toBeInTheDocument();
});
it("persists the chat layout preference and changes the message presentation", async () => {
  start();
  nav("Settings");
  fireEvent.change(screen.getByLabelText("Message alignment"), {
    target: { value: "bubbles" },
  });
  await waitFor(() =>
    expect(loadDemo().preferences.settings.chatLayout).toBe("bubbles"),
  );
  fireEvent.change(screen.getByLabelText("Time format"), {
    target: { value: "24" },
  });
  await waitFor(() =>
    expect(loadDemo().preferences.settings.timeFormat).toBe("24"),
  );
  nav("Chat");
  fireEvent.change(screen.getByLabelText("Message"), {
    target: { value: "Layout check" },
  });
  fireEvent.click(screen.getByLabelText("Send message"));
  expect(
    (await screen.findByText("Layout check")).closest("article"),
  ).toHaveClass("bubble-message", "own");
  const messageTime = screen
    .getByText("Layout check")
    .closest("article")
    .querySelector("time");
  expect(messageTime).toHaveTextContent(/^\d{2}:\d{2}$/);
});

it("moves a file from My files into a team library and back without losing its URL", async () => {
  const data = loadDemo();
  data.library = {
    folders: {},
    files: {
      original: {
        id: "original",
        name: "report.pdf",
        kind: "pdf",
        url: "data:application/pdf;base64,JVBERi0xLjQ=",
        size: 9,
        createdAt: 1,
        createdBy: "mayur",
        folderId: "",
      },
    },
  };
  saveDemo(data);
  start();
  await team();
  const teamId = Object.keys(loadDemo().teams)[0];
  nav("Storage");
  fireEvent.click(screen.getByLabelText("File options for report.pdf"));
  fireEvent.click(screen.getByRole("menuitem", { name: "Move to…" }));
  fireEvent.change(screen.getByLabelText("Destination library"), {
    target: { value: teamId },
  });
  expect(screen.getByRole("button", { name: "Move here" })).toBeEnabled();
  fireEvent.click(screen.getByRole("button", { name: "Move here" }));
  await waitFor(() =>
    expect(Object.keys(loadDemo().library.files)).toHaveLength(0),
  );
  let state = loadDemo();
  expect(Object.values(state.teams[teamId].files)[0].url).toBe(
    data.library.files.original.url,
  );
  fireEvent.click(screen.getByRole("button", { name: "Team files" }));
  fireEvent.click(screen.getByLabelText("File options for report.pdf"));
  fireEvent.click(screen.getByRole("menuitem", { name: "Move to…" }));
  fireEvent.change(screen.getByLabelText("Destination library"), {
    target: { value: "personal" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Move here" }));
  await waitFor(() =>
    expect(Object.keys(loadDemo().teams[teamId].files)).toHaveLength(0),
  );
  expect(Object.values(loadDemo().library.files)[0].url).toBe(
    data.library.files.original.url,
  );
});
it("keeps a transfer dialog open while its save is pending, including Escape", async () => {
  let finish;
  const close = vi.fn();
  const transfer = vi.fn(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  render(
    <FileTransferDialog
      file={{ id: "file", name: "report.pdf" }}
      operation="copy"
      sourceLibrary="personal"
      libraries={[{ id: "personal", name: "My files", folders: {} }]}
      onClose={close}
      onTransfer={transfer}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Copy here" }));
  const cancel = new Event("cancel", { bubbles: false, cancelable: true });
  fireEvent(screen.getByRole("dialog"), cancel);
  expect(cancel.defaultPrevented).toBe(true);
  expect(close).not.toHaveBeenCalled();
  expect(screen.getByLabelText("Destination library")).toBeDisabled();
  finish();
  await waitFor(() => expect(close).toHaveBeenCalledOnce());
});
it("resets content scrolling when navigating between workspace sections", async () => {
  start();
  await team();
  nav("Calendar");
  const main = screen.getByRole("main");
  main.scrollTop = 400;
  nav("Settings");
  expect(screen.getByRole("main").scrollTop).toBe(0);
});

it("automatically saves an uploaded photo across chat, team, dashboard and reload", async () => {
  start();
  fireEvent.click(screen.getByLabelText("Edit profile"));
  fireEvent.change(screen.getByLabelText("Profile photo"), {
    target: {
      files: [new File(["image"], "avatar.png", { type: "image/png" })],
    },
  });
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Save profile" })).toBeEnabled(),
  );
  expect(screen.getByRole("status")).toHaveTextContent("Profile photo saved.");
  await waitFor(() =>
    expect(loadDemo().users.mayur.photoURL).toMatch(/^data:image\/png;base64,/),
  );
  const url = loadDemo().users.mayur.photoURL;
  await team();
  expect(screen.getAllByRole("img", { name: "Mayur Bohra" })).toHaveLength(3);
  nav("Chat");
  fireEvent.change(screen.getByLabelText("Message"), {
    target: { value: "Photo saved" },
  });
  fireEvent.click(screen.getByLabelText("Send message"));
  const message = await screen.findByText("Photo saved");
  expect(
    within(message.closest("article")).getByRole("img", {
      name: "Mayur Bohra",
    }),
  ).toHaveAttribute("src", url);
  cleanup();
  start();
  expect(screen.getAllByRole("img", { name: "Mayur Bohra" })).toHaveLength(3);
  for (const image of screen.getAllByRole("img", { name: "Mayur Bohra" }))
    expect(image).toHaveAttribute("src", url);
});

it("keeps the profile photo and enables retry after an unconfirmed save", async () => {
  const photoURL = "https://res.cloudinary.com/demo/image/upload/avatar.png";
  const save = vi
    .fn()
    .mockRejectedValueOnce(new Error("Profile save was not confirmed."))
    .mockResolvedValueOnce();
  const notice = vi.fn();
  render(
    <Profile
      user={{ ...demoUser, photoURL }}
      demo
      onSave={save}
      onNotice={notice}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Save profile" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Profile save was not confirmed",
  );
  expect(screen.getByRole("button", { name: "Save profile" })).toBeEnabled();
  expect(screen.getByRole("img", { name: demoUser.name })).toHaveAttribute(
    "src",
    photoURL,
  );
  expect(notice).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Save profile" }));
  await waitFor(() => expect(notice).toHaveBeenCalledWith("Profile updated."));
  expect(save).toHaveBeenLastCalledWith(expect.objectContaining({ photoURL }));
});

it("loads the persisted photo when the user directory arrives after the profile mounts", async () => {
  const props = {
    user: demoUser,
    demo: true,
    onSave: vi.fn(),
    onPhotoSave: vi.fn(),
    onNotice: vi.fn(),
  };
  const { rerender } = render(<Profile {...props} />);
  const photoURL = "https://res.cloudinary.com/demo/image/upload/saved.png";
  rerender(<Profile {...props} user={{ ...demoUser, photoURL }} />);
  expect(
    await screen.findByRole("img", { name: demoUser.name }),
  ).toHaveAttribute("src", photoURL);
});
it("automatically removes a saved profile photo and keeps the removal across reload", async () => {
  const data = loadDemo();
  data.users.mayur.photoURL =
    "https://res.cloudinary.com/demo/image/upload/saved.png";
  saveDemo(data);
  start();
  fireEvent.click(screen.getByLabelText("Edit profile"));
  fireEvent.click(screen.getByRole("button", { name: "Remove photo" }));
  await waitFor(() => expect(loadDemo().users.mayur.photoURL).toBe(""));
  expect(screen.getByRole("status")).toHaveTextContent(
    "Profile photo removed.",
  );
  cleanup();
  start();
  expect(
    screen.queryByRole("img", { name: demoUser.name }),
  ).not.toBeInTheDocument();
});
it("retains the previous photo when automatic photo persistence fails", async () => {
  const photoURL = "https://res.cloudinary.com/demo/image/upload/saved.png";
  const save = vi.fn(),
    notice = vi.fn(),
    savePhoto = vi
      .fn()
      .mockRejectedValueOnce(new Error("Photo save failed. Try again."));
  render(
    <Profile
      user={{ ...demoUser, photoURL }}
      demo
      onSave={save}
      onPhotoSave={savePhoto}
      onNotice={notice}
    />,
  );
  fireEvent.change(screen.getByLabelText("Profile photo"), {
    target: { files: [new File(["image"], "next.png", { type: "image/png" })] },
  });
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Photo save failed",
  );
  expect(screen.getByRole("img", { name: demoUser.name })).toHaveAttribute(
    "src",
    photoURL,
  );
  expect(screen.getByRole("button", { name: "Choose photo" })).toBeEnabled();
  expect(notice).not.toHaveBeenCalled();
  expect(save).not.toHaveBeenCalled();
});
