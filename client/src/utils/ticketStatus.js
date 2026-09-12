const ticketStatusDetails = {
  VALID: {
    canCheckIn: true,
    userHeading: "Ready for check-in",
    userSummary: "Present this ticket at the entrance when you arrive.",
    userDetail:
      "Show the QR code to the check-in team. Each ticket can be accepted once, so keep it private until you arrive.",
    adminMessage:
      "Ticket is valid. Confirm the attendee details before check-in.",
    adminTone: "success",
    adminActionLabel: "Check in attendee"
  },
  USED: {
    canCheckIn: false,
    userHeading: "Already checked in",
    userSummary: "This ticket has already been used for entry.",
    userDetail:
      "This ticket was accepted at the entrance and cannot be used for another check-in.",
    adminMessage:
      "This ticket has already been checked in. Do not admit it again.",
    adminTone: "warning",
    adminActionLabel: "Already checked in"
  },
  CANCELLED: {
    canCheckIn: false,
    userHeading: "Ticket cancelled",
    userSummary: "This ticket was cancelled and is no longer valid for entry.",
    userDetail:
      "The cancelled ticket cannot be scanned or accepted at the entrance.",
    adminMessage: "This ticket was cancelled and cannot be checked in.",
    adminTone: "danger",
    adminActionLabel: "Ticket cancelled"
  },
  REFUNDED: {
    canCheckIn: false,
    userHeading: "Ticket refunded",
    userSummary: "This ticket was refunded and is no longer valid for entry.",
    userDetail:
      "The refunded ticket cannot be scanned or accepted at the entrance.",
    adminMessage: "This ticket was refunded and cannot be checked in.",
    adminTone: "danger",
    adminActionLabel: "Ticket refunded"
  }
};

const unavailableTicketDetails = {
  canCheckIn: false,
  userHeading: "Ticket unavailable",
  userSummary: "This ticket is not currently valid for entry.",
  userDetail:
    "This ticket cannot be scanned or accepted at the entrance. Contact the event team if you need help.",
  adminMessage: "This ticket is not valid for check-in.",
  adminTone: "warning",
  adminActionLabel: "Cannot check in"
};

export function getTicketStatusDetails(status) {
  const normalizedStatus = String(status ?? "").trim().toUpperCase();
  return ticketStatusDetails[normalizedStatus] ?? unavailableTicketDetails;
}
