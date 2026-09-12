const ticketTypeQueryKey = "ticketType";
const quantityQueryKey = "quantity";

function getTicketLimit(ticketType) {
  const availableQuantity = Number(ticketType?.availableQuantity);
  const maxPerUser = Number(ticketType?.maxPerUser);

  if (
    ticketType?.saleStatus !== "AVAILABLE" ||
    !Number.isInteger(availableQuantity) ||
    !Number.isInteger(maxPerUser)
  ) {
    return 0;
  }

  return Math.min(availableQuantity, maxPerUser);
}

export function createBookingReturnLocation(location, selection) {
  const searchParams = new URLSearchParams(location.search ?? "");
  searchParams.set(ticketTypeQueryKey, selection.ticketTypeId);
  searchParams.set(quantityQueryKey, String(selection.quantity));

  return {
    pathname: location.pathname,
    search: `?${searchParams.toString()}`,
    hash: "#booking"
  };
}

export function getValidBookingSelection(search, ticketTypes) {
  const searchParams = new URLSearchParams(search ?? "");
  const ticketTypeId = searchParams.get(ticketTypeQueryKey);
  const rawQuantity = searchParams.get(quantityQueryKey);

  if (!ticketTypeId || !rawQuantity || !/^[1-9]\d*$/.test(rawQuantity)) {
    return null;
  }

  const ticketType = ticketTypes.find((candidate) => candidate.id === ticketTypeId);
  const quantity = Number(rawQuantity);
  const ticketLimit = getTicketLimit(ticketType);

  if (!ticketType || !Number.isSafeInteger(quantity) || quantity > ticketLimit) {
    return null;
  }

  return {
    ticketTypeId,
    quantity: String(quantity)
  };
}
