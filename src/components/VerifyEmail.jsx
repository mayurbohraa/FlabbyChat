import React, { useEffect, useState } from "react";
import logo from "../assets/images/FlabbyChatLogo.png";
import * as cloud from "../services/cloud.js";
import { friendlyError } from "../utils/chat-data.js";
export default function VerifyEmail({ user, onVerified, onLogout }) {
  const [status, setStatus] = useState("Sending verification email…");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(true);
  const [checking, setChecking] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  useEffect(() => {
    let active = true;
    cloud
      .sendVerification(user)
      .then((sentAt) => {
        if (!active) return;
        setStatus("Verification email sent. Check your inbox and spam folder.");
        setCooldown(
          Math.max(0, Math.ceil((sentAt + 60000 - Date.now()) / 1000)),
        );
      })
      .catch((err) => {
        if (active) {
          setStatus("Your account is waiting for email verification.");
          setError(friendlyError(err));
        }
      })
      .finally(() => {
        if (active) setSending(false);
      });
    return () => {
      active = false;
    };
  }, [user.uid]);
  useEffect(() => {
    if (!cooldown) return;
    const timer = setTimeout(
      () => setCooldown((seconds) => Math.max(0, seconds - 1)),
      1000,
    );
    return () => clearTimeout(timer);
  }, [cooldown]);
  async function resend() {
    setSending(true);
    setError("");
    try {
      const sentAt = await cloud.sendVerification(user);
      setStatus("Verification email sent. Check your inbox and spam folder.");
      setCooldown(Math.max(0, Math.ceil((sentAt + 60000 - Date.now()) / 1000)));
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setSending(false);
    }
  }
  async function check() {
    setChecking(true);
    setError("");
    try {
      const updated = await cloud.refreshVerification(user);
      if (updated.emailVerified) onVerified(updated);
      else
        setStatus(
          "Your email is not verified yet. Open the link in the verification email, then check again.",
        );
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setChecking(false);
    }
  }
  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-brand">
          <img className="brand-logo" src={logo} alt="FlabbyChat logo" />
          <h1>FlabbyChat</h1>
        </div>
        <h2 className="verification-title">Verify your email</h2>
        <p className="verification-copy">
          Before you can use chat, verify <strong>{user.email}</strong> using
          the link in your email.
        </p>
        <p className="auth-status" role="status">
          {status}
        </p>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <button
          className="primary auth-submit"
          disabled={checking || sending}
          onClick={check}
        >
          {checking ? "Checking…" : "I’ve verified my email"}
        </button>
        <button
          className="secondary verification-resend"
          disabled={sending || checking || cooldown > 0}
          onClick={resend}
        >
          {sending
            ? "Sending…"
            : cooldown > 0
              ? `Resend email in ${cooldown}s`
              : "Resend verification email"}
        </button>
        <p className="auth-switch">
          <button
            disabled={sending || checking}
            onClick={async () => {
              try {
                await onLogout();
              } catch (err) {
                setError(friendlyError(err));
              }
            }}
          >
            Back to login
          </button>
        </p>
      </section>
    </main>
  );
}
