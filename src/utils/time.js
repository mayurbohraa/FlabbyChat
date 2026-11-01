export function formatTime(value, format = "12") {
  const date =
    typeof value === "string" && /^\d{2}:\d{2}$/.test(value)
      ? new Date(`2000-01-01T${value}:00`)
      : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: format !== "24",
  });
}
