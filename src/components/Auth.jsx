import React, { useState } from "react";
import logo from "../assets/images/FlabbyChatLogo.png";
import * as cloud from "../services/cloud.js";
import { validateSignup, friendlyError } from "../utils/chat-data.js";

export default function Auth({ onDemo }) {
  const [page, setPage] = useState("login");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [email, setEmail] = useState("");

  async function submit(e) {
    e.preventDefault();
    setError("");
    setNotice("");
    const form = Object.fromEntries(new FormData(e.currentTarget));
    if (page === "signup") {
      const problem = validateSignup(form.name, form.password, form.confirm);
      if (problem) {
        setError(problem);
        return;
      }
    }
    if (!cloud.configured) {
      setError(
        "Firebase is not connected yet. Follow the setup in README.md, or try the demo below.",
      );
      return;
    }
    setBusy(true);
    try {
      if (page === "reset") {
        await cloud.resetPassword(form.email.trim());
        setNotice(
          "If an account exists for this email, a password reset link has been sent. Check your inbox and spam folder.",
        );
      } else if (page === "login")
        await cloud.login(form.email.trim(), form.password);
      else
        await cloud.signup(form.name.trim(), form.email.trim(), form.password);
    } catch (err) {
      if (page === "reset" && err.code === "auth/user-not-found")
        setNotice(
          "If an account exists for this email, a password reset link has been sent. Check your inbox and spam folder.",
        );
      else setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  function switchPage(next) {
    setPage(next);
    setError("");
    setNotice("");
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-brand">
          <img className="brand-logo" src={logo} alt="FlabbyChat logo" />
          <h1>FlabbyChat</h1>
        </div>
        <p className="auth-description">
          A simple place for your group to chat.
        </p>
        <h2>
          {page === "reset"
            ? "Reset your password"
            : page === "login"
              ? "Login to your account"
              : "Create an account"}
        </h2>
        {page === "reset" && (
          <p className="verification-copy">
            Enter your account email to receive a password reset link.
          </p>
        )}
        <form key={page} onSubmit={submit}>
          {page === "signup" && (
            <label>
              Full name
              <input
                name="name"
                autoComplete="name"
                maxLength={60}
                required
                placeholder="Your name"
              />
            </label>
          )}
          <label>
            Email address
            <input
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="you@example.com"
              defaultValue={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          {page !== "reset" && (
            <label>
              Password
              <input
                name="password"
                type="password"
                autoComplete={
                  page === "login" ? "current-password" : "new-password"
                }
                minLength={page === "signup" ? 8 : undefined}
                required
                placeholder={
                  page === "signup" ? "At least 8 characters" : "Your password"
                }
              />
            </label>
          )}
          {page === "signup" && (
            <label>
              Confirm password
              <input
                name="confirm"
                type="password"
                autoComplete="new-password"
                required
                placeholder="Enter the password again"
              />
            </label>
          )}
          {page === "login" && (
            <div className="forgot-password">
              <button
                type="button"
                disabled={busy}
                onClick={() => switchPage("reset")}
              >
                Forgot password?
              </button>
            </div>
          )}
          {notice && (
            <p className="auth-status" role="status">
              {notice}
            </p>
          )}
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          <button className="primary auth-submit" disabled={busy}>
            {busy
              ? "Please wait…"
              : page === "reset"
                ? "Send reset link"
                : page === "login"
                  ? "Login"
                  : "Sign up"}
          </button>
        </form>
        {page === "reset" ? (
          <p className="auth-switch">
            <button disabled={busy} onClick={() => switchPage("login")}>
              Back to login
            </button>
          </p>
        ) : (
          <p className="auth-switch">
            {page === "login"
              ? "Don’t have an account?"
              : "Already have an account?"}{" "}
            <button
              onClick={() => switchPage(page === "login" ? "signup" : "login")}
            >
              {page === "login" ? "Sign up" : "Login"}
            </button>
          </p>
        )}
        <div className="demo-option">
          <button disabled={busy} onClick={onDemo}>
            Try demo without an account
          </button>
          <small>Sample chat saved only in this browser.</small>
        </div>
      </section>
    </main>
  );
}
