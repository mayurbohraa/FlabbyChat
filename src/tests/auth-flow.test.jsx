import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from "@testing-library/react";
import { beforeEach, afterEach, it, expect, vi } from "vitest";
import App from "../App.jsx";
import Auth from "../components/Auth.jsx";
import * as cloud from "../services/cloud.js";

const session = vi.hoisted(() => ({ user: null, listener: null }));

vi.mock("../services/cloud.js", () => ({
  configured: true,
  watchAuth: vi.fn((callback) => {
    session.listener = callback;
    callback(session.user);
    return () => {};
  }),
  ensureProfile: vi.fn(async () => {}),
  sendVerification: vi.fn(async () => Date.now()),
  refreshVerification: vi.fn(),
  resetPassword: vi.fn(async () => {}),
  login: vi.fn(),
  signup: vi.fn(),
  logout: vi.fn(async () => session.listener(null)),
}));

vi.mock("../components/Chat.jsx", () => ({
  default: () => <div>Verified chat</div>,
}));

beforeEach(() => {
  session.user = {
    uid: "student",
    email: "student@example.com",
    displayName: "Student",
    emailVerified: false,
  };
  vi.clearAllMocks();
  cloud.sendVerification.mockResolvedValue(Date.now());
  cloud.resetPassword.mockResolvedValue();
  cloud.refreshVerification.mockResolvedValue(session.user);
});

afterEach(cleanup);

it("sends a verification email and blocks an unverified user from chat and profile writes", async () => {
  render(<App />);
  expect(
    await screen.findByRole("heading", { name: "Verify your email" }),
  ).toBeInTheDocument();
  await waitFor(() => expect(cloud.sendVerification).toHaveBeenCalled());
  expect(screen.queryByText("Verified chat")).not.toBeInTheDocument();
  expect(cloud.ensureProfile).not.toHaveBeenCalled();
  expect(screen.getByText("student@example.com")).toBeInTheDocument();
});

it("keeps the verification screen when the email is still unverified", async () => {
  render(<App />);
  const check = await screen.findByRole("button", {
    name: "I’ve verified my email",
  });
  await waitFor(() => expect(check).toBeEnabled());
  fireEvent.click(check);
  expect(
    await screen.findByText(/Your email is not verified yet/),
  ).toBeInTheDocument();
  expect(cloud.ensureProfile).not.toHaveBeenCalled();
});

it("opens chat only after refreshing a verified user and prepares their profile", async () => {
  cloud.refreshVerification.mockResolvedValue({
    ...session.user,
    emailVerified: true,
  });
  render(<App />);
  const check = await screen.findByRole("button", {
    name: "I’ve verified my email",
  });
  await waitFor(() => expect(check).toBeEnabled());
  fireEvent.click(check);
  expect(await screen.findByText("Verified chat")).toBeInTheDocument();
  expect(cloud.ensureProfile).toHaveBeenCalledWith(
    expect.objectContaining({ emailVerified: true }),
  );
});

it("allows retry when the verification email could not be sent", async () => {
  cloud.sendVerification.mockRejectedValueOnce({
    code: "auth/too-many-requests",
  });
  render(<App />);
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Too many attempts",
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Resend verification email" }),
  );
  expect(
    await screen.findByText(/Verification email sent/),
  ).toBeInTheDocument();
});

it("sends a reset email and returns to login without showing a password field on reset", async () => {
  render(<Auth onDemo={() => {}} />);
  fireEvent.change(screen.getByLabelText("Email address"), {
    target: { value: "student@example.com" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Forgot password?" }));
  expect(
    screen.getByRole("heading", { name: "Reset your password" }),
  ).toBeInTheDocument();
  expect(screen.queryByLabelText("Password")).not.toBeInTheDocument();
  expect(screen.getByLabelText("Email address")).toHaveValue(
    "student@example.com",
  );
  fireEvent.click(screen.getByRole("button", { name: "Send reset link" }));
  expect(await screen.findByRole("status")).toHaveTextContent(
    "If an account exists",
  );
  expect(cloud.resetPassword).toHaveBeenCalledWith("student@example.com");
  fireEvent.click(screen.getByRole("button", { name: "Back to login" }));
  expect(screen.getByLabelText("Password")).toBeInTheDocument();
});

it("does not reveal whether a reset email belongs to an existing account", async () => {
  cloud.resetPassword.mockRejectedValueOnce({ code: "auth/user-not-found" });
  render(<Auth onDemo={() => {}} />);
  fireEvent.click(screen.getByRole("button", { name: "Forgot password?" }));
  fireEvent.change(screen.getByLabelText("Email address"), {
    target: { value: "unknown@example.com" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Send reset link" }));
  expect(await screen.findByRole("status")).toHaveTextContent(
    "If an account exists",
  );
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});
