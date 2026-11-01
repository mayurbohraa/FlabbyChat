import React, { useRef, useState } from "react";
import { Palette, Bell, HardDrive, Download, Upload } from "lucide-react";
import { download, makeBackup } from "../utils/collaboration-data.js";
export default function SettingsPanel({
  preferences,
  onSetting,
  run,
  team,
  teams,
  library,
  context,
  setContext,
  onImport,
  onNotice,
}) {
  const [section, setSection] = useState("Appearance");
  const importer = useRef(null);
  const sections = [
    ["Appearance", Palette],
    ["Notifications", Bell],
    ["Backup", HardDrive],
  ];
  return (
    <div className="account-layout settings-layout">
      <nav className="account-tabs" aria-label="Settings sections">
        {sections.map(([name, Icon]) => (
          <button
            key={name}
            aria-current={section === name ? "page" : undefined}
            onClick={() => setSection(name)}
          >
            <Icon size={17} />
            {name}
          </button>
        ))}
      </nav>
      <section
        className="module-card account-card"
        hidden={section !== "Appearance"}
      >
        <header className="account-card-heading">
          <h2>Appearance</h2>
          <p>Set a theme that feels comfortable to use.</p>
        </header>
        <div className="setting-row">
          <div className="setting-copy">
            <label htmlFor="app-theme">Theme</label>
            <p>Follow your device, or choose a light or dark look.</p>
          </div>
          <select
            id="app-theme"
            aria-label="Theme"
            value={preferences.settings?.theme || "system"}
            onChange={(e) =>
              run(
                () => onSetting("theme", e.target.value),
                "Theme updated.",
                false,
              )
            }
          >
            <option value="system">Use system theme</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </div>
        <div className="theme-sample" aria-hidden="true">
          <div className="sample-bar">
            <i />
            <i />
            <i />
          </div>
          <div className="sample-body">
            <div className="sample-sidebar">
              <i />
              <i />
              <i />
            </div>
            <div className="sample-content">
              <i />
              <div>
                <i />
                <i />
                <i />
              </div>
            </div>
          </div>
        </div>
      </section>
      <section
        className="module-card account-card"
        hidden={section !== "Notifications"}
      >
        <header className="account-card-heading">
          <h2>Notifications</h2>
          <p>Control sounds and browser alerts.</p>
        </header>
        <label className="setting-row">
          <span className="setting-copy">
            <strong>Calling sounds</strong>
            <small>Play a ringtone for incoming and outgoing calls.</small>
          </span>
          <input
            className="switch-input"
            aria-label="Calling sounds"
            type="checkbox"
            checked={preferences.settings?.callSound !== false}
            onChange={(e) =>
              run(
                () => onSetting("callSound", e.target.checked),
                "Calling sound preference saved.",
                false,
              )
            }
          />
        </label>
        <label className="setting-row">
          <span className="setting-copy">
            <strong>Browser notifications</strong>
            <small>Show alerts when FlabbyChat is in the background.</small>
          </span>
          <input
            className="switch-input"
            aria-label="Browser notifications"
            type="checkbox"
            checked={Boolean(preferences.settings?.browserNotifications)}
            onChange={async (e) => {
              const enabled = e.target.checked;
              await run(
                async () => {
                  if (enabled) {
                    if (!("Notification" in window))
                      throw new Error(
                        "This browser does not support notifications.",
                      );
                    const permission = await Notification.requestPermission();
                    if (permission !== "granted")
                      throw new Error(
                        "Browser notifications were not allowed. In-app notifications will still work.",
                      );
                  }
                  await onSetting("browserNotifications", enabled);
                },
                "Notification preference saved.",
                false,
              );
            }}
          />
        </label>
        <p className="account-note">
          Keep the app open to receive calls and browser notifications.
        </p>
      </section>
      <section
        className="module-card account-card"
        hidden={section !== "Backup"}
      >
        <header className="account-card-heading">
          <h2>Backup</h2>
          <p>Save a copy of your records or import an existing backup.</p>
        </header>
        <div className="setting-row">
          <div className="setting-copy">
            <label htmlFor="backup-team">Team to include</label>
            <p>Your personal library is included automatically.</p>
          </div>
          <select
            id="backup-team"
            aria-label="Backup team"
            value={team?.id || ""}
            onChange={(e) =>
              setContext({
                ...context,
                teamId: e.target.value,
                workspaceId: "",
              })
            }
          >
            {!team && <option value="">Personal files only</option>}
            {Object.values(teams).map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
        <div className="setting-row">
          <div className="setting-copy">
            <strong>Export backup</strong>
            <p>Download personal files and selected-team project records.</p>
          </div>
          <button
            className="secondary"
            onClick={() => {
              download(
                "flabbychat-backup.json",
                JSON.stringify(makeBackup(library, team), null, 2),
              );
              onNotice(
                "Backup exported. File links are included; cloud file contents are not copied.",
              );
            }}
          >
            <Download size={16} />
            Export JSON
          </button>
        </div>
        <div className="setting-row">
          <div className="setting-copy">
            <strong>Import backup</strong>
            <p>Review a JSON backup before adding its records.</p>
          </div>
          <button
            className="secondary"
            onClick={() => importer.current.click()}
          >
            <Upload size={16} />
            Import JSON
          </button>
        </div>
        <p className="account-note">
          Backups include file links, not cloud file contents. Passwords and
          team memberships are excluded.
        </p>
        <input
          ref={importer}
          hidden
          type="file"
          accept="application/json,.json"
          aria-label="Import backup"
          onChange={onImport}
        />
      </section>
    </div>
  );
}
