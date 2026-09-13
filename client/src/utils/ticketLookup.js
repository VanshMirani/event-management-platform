export function createTicketLookupPayload(value) {
  const normalizedValue = value.trim();

  try {
    const scannedUrl = new URL(normalizedValue);
    const qrToken = scannedUrl.searchParams.get("token")?.trim();

    if (qrToken) {
      return { qrToken };
    }
  } catch {
    // Ticket codes and raw scanner tokens are not URLs.
  }

  return /^TCK-/i.test(normalizedValue)
    ? { ticketCode: `TCK-${normalizedValue.slice(4)}` }
    : { qrToken: normalizedValue };
}
