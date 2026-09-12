const EVENT_TIME_ZONE = "Asia/Kolkata";
const INDIA_OFFSET = "+05:30";

export function formatDateTime(value) {
  if (!value) {
    return "Not scheduled";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    timeZone: EVENT_TIME_ZONE,
    timeZoneName: "short",
    year: "numeric"
  }).format(new Date(value));
}

export function toDateTimeLocalValue(value) {
  if (!value) {
    return "";
  }

  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
    minute: "2-digit",
    month: "2-digit",
    timeZone: EVENT_TIME_ZONE,
    year: "numeric"
  })
    .formatToParts(new Date(value))
    .reduce((result, part) => ({ ...result, [part.type]: part.value }), {});

  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

export function fromDateTimeLocalValue(value) {
  if (!value) {
    return "";
  }

  const valueWithSeconds = value.length === 16 ? `${value}:00` : value;
  return new Date(`${valueWithSeconds}${INDIA_OFFSET}`).toISOString();
}
