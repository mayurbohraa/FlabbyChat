export function savedTheme() {
  try {
    return localStorage.getItem("flabbychat.theme") || "system";
  } catch {
    return "system";
  }
}
export function applyTheme(value = savedTheme()) {
  const mode = ["light", "dark", "system"].includes(value) ? value : "system";
  document.documentElement.dataset.theme =
    mode === "system"
      ? window.matchMedia?.("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : mode;
  try {
    localStorage.setItem("flabbychat.theme", mode);
  } catch {
    /* Theme remains active even if browser storage is unavailable. */
  }
}
