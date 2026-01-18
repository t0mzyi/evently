import eventsDb from "../../model/eventsDb.js";
import { venueDetails } from "./venueService.js";

//user
export const allEvents = async () => {
  const events = await eventsDb.find({ status: "approved" }).populate("categoryId", "name");
  return events;
};

export const singleEventFinder = async (eventId) => {
  const event = await eventsDb.findById(eventId).populate("categoryId", "name");
  let venue;
  if (event.venueType == "iconic") {
    venue = await venueDetails(event.venueId);
  } else {
    venue = event.venueDetails;
  }

  let lowestPrice = 0;
  if (event.ticketTypes && event.ticketTypes.length) {
    lowestPrice = Math.min(...event.ticketTypes.map((t) => t.price));
  }

  const totalTickets = event.ticketTypes.reduce((acc, t) => (acc = acc + t.quantityTotal), 0);
  const ticketsLeft = event.ticketTypes.reduce((acc, t) => (acc = acc + t.quantityAvailable), 0);

  console.log(ticketsLeft);
  return { event, venue, lowestPrice, totalTickets, ticketsLeft };
};
