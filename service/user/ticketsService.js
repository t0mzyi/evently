import eventsDb from "../../model/eventsDb.js";
import { formatDate } from "../../utils/dateTimeFormator.js";

export const ticketBooking = async (eventId) => {
  const event = await eventsDb.findById(eventId);
  if (!event) throw new Error("No event such exists");
  event.sDate = formatDate(event.startDate);
  event.eDate = formatDate(event.endDate);
  return event;
};
