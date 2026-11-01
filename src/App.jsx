import React, { useEffect, useState } from "react";
import Auth from "./components/Auth.jsx";
import VerifyEmail from "./components/VerifyEmail.jsx";
import Chat from "./components/Chat.jsx";
import * as cloud from "./services/cloud.js";
import { demoUser, friendlyError } from "./utils/chat-data.js";
import { applyTheme, savedTheme } from "./utils/theme.js";
export default function App() {
  useEffect(() => {
    applyTheme();
    const media = window.matchMedia?.("(prefers-color-scheme: dark)");
    const change = () => {
      if (savedTheme() === "system") applyTheme();
    };
    media?.addEventListener("change", change);
    return () => media?.removeEventListener("change", change);
  }, []);
  const [account, setAccount] = useState(null);
  const [demo, setDemo] = useState(false);
  const [checking, setChecking] = useState(cloud.configured);
  const [error, setError] = useState("");
  function accountChanged(user) {
    // Copy the verification flag: Firebase mutates its User instance on reload.
    setAccount(user ? { user, emailVerified: user.emailVerified } : null);
    setChecking(false);
    setError("");
    if (user?.emailVerified)
      cloud.ensureProfile(user).catch((err) => setError(friendlyError(err)));
  }
  useEffect(() => cloud.watchAuth(accountChanged), []);
  if (checking) return <div className="loading">Loading FlabbyChat…</div>;
  if (!demo && !account)
    return (
      <Auth
        onDemo={() => {
          setError("");
          setDemo(true);
        }}
      />
    );
  // Keep unverified accounts outside the cloud-backed workspace.
  if (!demo && !account.emailVerified)
    return (
      <VerifyEmail
        user={account.user}
        onVerified={accountChanged}
        onLogout={() => cloud.logout()}
      />
    );
  const user = demo
    ? demoUser
    : {
        id: account.user.uid,
        email: account.user.email,
        name: account.user.displayName || account.user.email.split("@")[0],
      };
  return (
    <Chat
      key={demo ? "demo" : user.id}
      user={user}
      demo={demo}
      initialError={error}
      onLogout={async () => {
        if (!demo) await cloud.logout();
        setDemo(false);
        setError("");
      }}
    />
  );
}
