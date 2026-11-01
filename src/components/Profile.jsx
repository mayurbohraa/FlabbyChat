import React, { useState, useRef, useEffect } from "react";
import { UserRound, LockKeyhole, Camera } from "lucide-react";
import * as cloud from "../services/cloud.js";
import Avatar from "./Avatar.jsx";
import { prepareAttachment } from "../services/storage.js";
import { friendlyError } from "../utils/chat-data.js";
export default function Profile({ user, demo, onSave, onPhotoSave, onNotice }) {
  const photoInput = useRef(null);
  const [section, setSection] = useState("Details");
  const [errorField, setErrorField] = useState("");
  const [photo, setPhoto] = useState(user.photoURL || ""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [uploading, setUploading] = useState(false),
    [savingPhoto, setSavingPhoto] = useState(false),
    [passwords, setPasswords] = useState({
      current: "",
      password: "",
      confirm: "",
    });
  // The directory may hydrate after this screen mounts, including after reload.
  useEffect(() => setPhoto(user.photoURL || ""), [user.photoURL]);
  async function removePhoto() {
    if (busy) return;
    setBusy(true);
    setSavingPhoto(true);
    setError("");
    setErrorField("");
    try {
      await onPhotoSave("");
      setPhoto("");
      onNotice("Profile photo removed.");
    } catch (err) {
      setErrorField("photo");
      setError(friendlyError(err));
    } finally {
      setBusy(false);
      setSavingPhoto(false);
    }
  }
  async function save(e) {
    e.preventDefault();
    if (busy) return;
    const data = Object.fromEntries(new FormData(e.currentTarget));
    setBusy(true);
    setError("");
    setErrorField("");
    try {
      if (!data.name.trim()) {
        setErrorField("name");
        throw new Error("Enter your name.");
      }
      await onSave({
        name: data.name.trim(),
        bio: data.bio.trim(),
        photoURL: photo,
      });
      onNotice("Profile updated.");
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }
  async function upload(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    setUploading(true);
    setError("");
    setErrorField("");
    try {
      if (!file.type.startsWith("image/"))
        throw new Error("Choose an image for your profile photo.");
      const result = await prepareAttachment(file, demo);
      setUploading(false);
      setSavingPhoto(true);
      // Uploading supplies a URL; saving it to the account makes it persistent.
      await onPhotoSave(result.url);
      setPhoto(result.url);
      onNotice("Profile photo saved.");
    } catch (err) {
      setErrorField("photo");
      setError(friendlyError(err));
    } finally {
      setUploading(false);
      setSavingPhoto(false);
      setBusy(false);
    }
  }
  async function password(e) {
    e.preventDefault();
    setError("");
    setErrorField("");
    if (demo) {
      setError(
        "Password changes require a signed-in account. Demo passwords are not stored.",
      );
      return;
    }
    if (passwords.password.length < 8) {
      setErrorField("password");
      setError("Use a new password with at least 8 characters.");
      return;
    }
    if (passwords.password !== passwords.confirm) {
      setErrorField("confirm");
      setError("The new passwords do not match.");
      return;
    }
    if (passwords.password === passwords.current) {
      setErrorField("password");
      setError("Choose a password different from your current password.");
      return;
    }
    setBusy(true);
    try {
      await cloud.changePassword(passwords.current, passwords.password);
      setPasswords({ current: "", password: "", confirm: "" });
      onNotice("Password updated successfully.");
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="account-layout profile-layout">
      <div className="profile-summary">
        <Avatar
          className="profile-summary-avatar"
          name={user.name}
          photoURL={photo}
        />
        <div>
          <strong>{user.name}</strong>
          <p>{user.email}</p>
        </div>
      </div>
      <nav className="account-tabs" aria-label="Profile sections">
        {(demo ? ["Details"] : ["Details", "Password"]).map((tab) => (
          <button
            key={tab}
            disabled={busy}
            aria-current={section === tab ? "page" : undefined}
            onClick={() => {
              setSection(tab);
              setError("");
              setErrorField("");
            }}
          >
            {tab === "Details" ? (
              <UserRound size={17} />
            ) : (
              <LockKeyhole size={17} />
            )}
            {tab}
          </button>
        ))}
      </nav>
      <div className="account-panel">
        {error && !errorField && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <form
          id="profile-details"
          hidden={section !== "Details"}
          className="module-card account-card"
          onSubmit={save}
        >
          <header className="account-card-heading">
            <h2>Profile details</h2>
            <p>Choose how your name and photo appear to others.</p>
          </header>
          <div className="profile-photo-row">
            <div className="setting-copy">
              <strong>Profile photo</strong>
              <small>
                JPG, PNG, WebP or GIF. Photo changes save automatically.
              </small>
            </div>
            <div className="control-actions">
              <button
                type="button"
                className="secondary"
                disabled={busy}
                onClick={() => photoInput.current.click()}
              >
                <Camera size={16} />
                {uploading
                  ? "Uploading…"
                  : savingPhoto
                    ? "Saving photo…"
                    : "Choose photo"}
              </button>
              {photo && (
                <button
                  type="button"
                  className="text-button"
                  disabled={busy}
                  onClick={removePhoto}
                >
                  Remove photo
                </button>
              )}
            </div>
            <input
              ref={photoInput}
              hidden
              type="file"
              aria-label="Profile photo"
              aria-invalid={errorField === "photo" || undefined}
              aria-describedby={
                errorField === "photo" ? "photo-error" : undefined
              }
              accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={upload}
            />
          </div>
          {errorField === "photo" && (
            <p id="photo-error" className="field-error" role="alert">
              {error}
            </p>
          )}
          <div className="profile-fields">
            <label>
              Name
              <input
                name="name"
                aria-invalid={errorField === "name" || undefined}
                aria-describedby={
                  errorField === "name" ? "name-error" : undefined
                }
                maxLength={60}
                required
                defaultValue={user.name}
              />
            </label>
            {errorField === "name" && (
              <p id="name-error" role="alert" className="field-error">
                {error}
              </p>
            )}
            <label>
              Email
              <input value={user.email || ""} readOnly />
            </label>
          </div>
          <p className="small-note">
            Your verified email identifies your account.
          </p>
          <label>
            About you
            <textarea
              name="bio"
              maxLength={300}
              defaultValue={user.bio || ""}
            />
          </label>
          <footer className="account-card-footer">
            <button className="primary" disabled={busy}>
              {uploading
                ? "Uploading photo…"
                : savingPhoto
                  ? "Saving photo…"
                  : busy
                    ? "Saving…"
                    : "Save profile"}
            </button>
          </footer>
        </form>
        <form
          id="password-details"
          hidden={section !== "Password"}
          className="module-card account-card"
          onSubmit={password}
        >
          <header className="account-card-heading">
            <h2>Change password</h2>
            <p>
              Use at least 8 characters and confirm with your current password.
            </p>
          </header>
          {[
            ["current", "Current password"],
            ["password", "New password"],
            ["confirm", "Confirm new password"],
          ].map(([key, label]) => (
            <label key={key}>
              {label}
              <input
                type="password"
                aria-label={label}
                required
                autoComplete={
                  key === "current" ? "current-password" : "new-password"
                }
                minLength={key === "current" ? undefined : 8}
                aria-invalid={errorField === key || undefined}
                aria-describedby={
                  errorField === key ? key + "-error" : undefined
                }
                value={passwords[key]}
                onChange={(e) =>
                  setPasswords({ ...passwords, [key]: e.target.value })
                }
              />
              {errorField === key && (
                <span id={key + "-error"} className="field-error" role="alert">
                  {error}
                </span>
              )}
            </label>
          ))}
          <footer className="account-card-footer">
            <button className="primary" disabled={busy}>
              Update password
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
