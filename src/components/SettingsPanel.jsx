import React, { useState } from "react";
import { Palette, Bell } from "lucide-react";
export default function SettingsPanel({
  preferences,
  onSetting,
  run,
}) {
  const [section, setSection] = useState("Appearance");
  const sections = [
    ["Appearance", Palette],
    ["Notifications", Bell],
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
        <div className="setting-row">
          <div className="setting-copy">
          <label htmlFor="chat-layout">Message layout</label>
            <p>
              Choose a single reading flow or a compact two-sided conversation.
            </p>
          </div>
          <select
            id="chat-layout"
            aria-label="Message layout"
            value={preferences.settings?.chatLayout || "list"}
            onChange={(e) =>
              run(
                () => onSetting("chatLayout", e.target.value),
                "Chat layout updated.",
                false,
              )
            }
          >
            <option value="list">Standard conversation</option>
            <option value="bubbles">Split conversation</option>
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
    </div>
  );
}
