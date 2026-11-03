// Store local calendar dates without converting them through UTC.
export const dateKey = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

// Local noon avoids midnight timezone/DST edges when navigating date-only values.
export const fromKey = (value) => new Date(value + "T12:00:00");

export function periodDates(value, mode) {
  const date = fromKey(value);
  if (mode === "Day") return [value];
  if (mode === "Week") {
    date.setDate(date.getDate() - date.getDay());
    return Array.from({ length: 7 }, (_, i) => {
      const day = new Date(date);
      day.setDate(day.getDate() + i);
      return dateKey(day);
    });
  }
  if (mode === "Year") return [];
  return Array.from(
    { length: new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate() },
    (_, i) => dateKey(new Date(date.getFullYear(), date.getMonth(), i + 1)),
  );
}

export function shiftDate(value, mode, direction) {
  const date = fromKey(value);
  if (mode === "Year") date.setFullYear(date.getFullYear() + direction);
  else if (mode === "Month") {
    const day = date.getDate();
    // Clamp month-end dates instead of letting Jan 31 roll into March.
    date.setDate(1);
    date.setMonth(date.getMonth() + direction);
    date.setDate(
      Math.min(
        day,
        new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate(),
      ),
    );
  } else date.setDate(date.getDate() + direction * (mode === "Week" ? 7 : 1));
  return dateKey(date);
}

export function callSummary(call) {
  const type = call.video ? "Video call" : "Voice call";
  if (call.duration > 0) {
    const seconds = Math.round(call.duration);
    return `${type} · ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
  }
  let outcome;
  switch (call.outcome) {
    case "completed":
      outcome = "Ended";
      break;
    case "missed":
      outcome = "Missed";
      break;
    case "declined":
      outcome = "Declined";
      break;
    case "cancelled":
      outcome = "Cancelled";
      break;
    default:
      outcome = call.outcome || "Ended";
  }
  return `${type} · ${outcome}`;
}
