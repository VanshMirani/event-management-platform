function getPhysicalLocation(event) {
  if (!event) {
    return "";
  }

  const locationParts = [event.venueName, event.address, event.city, event.state].filter(Boolean);

  if (locationParts.length > 0 && event.country) {
    locationParts.push(event.country);
  } else if (locationParts.length === 0 && !event.onlineUrl && event.country) {
    locationParts.push(event.country);
  }

  return locationParts.join(", ");
}

export function EventLocation({ event, fallback = "To be announced" }) {
  const eventType = event?.eventType ?? event?.type;
  const physicalLocation = getPhysicalLocation(event);

  if (eventType === "ONLINE") {
    return event?.onlineUrl ? (
      <a
        className="inline-flex break-all font-bold text-cyan underline decoration-cyan/30 underline-offset-4 hover:text-aurora"
        href={event.onlineUrl}
        rel="noreferrer"
        target="_blank"
      >
        Open online event link
        <span aria-hidden="true" className="ml-1">
          ↗
        </span>
      </a>
    ) : (
      <p className="text-ink/70">Online event — access details are provided after confirmation.</p>
    );
  }

  if (!physicalLocation && !event?.onlineUrl) {
    return <p className="text-ink/70">{fallback}</p>;
  }

  return (
    <div className="space-y-2 text-ink/70">
      {physicalLocation ? <p>{physicalLocation}</p> : null}
      {event?.onlineUrl ? (
        <a
          className="inline-flex break-all font-bold text-cyan underline decoration-cyan/30 underline-offset-4 hover:text-aurora"
          href={event.onlineUrl}
          rel="noreferrer"
          target="_blank"
        >
          Open online event link
          <span aria-hidden="true" className="ml-1">
            ↗
          </span>
        </a>
      ) : null}
    </div>
  );
}
