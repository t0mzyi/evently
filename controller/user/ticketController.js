import { ticketBooking } from "../../service/user/ticketsService.js";

export const bookTicket = async (req, res) => {
  const eventId = req.params.eventId;
  try {
    const event = await ticketBooking(eventId);
    console.log(event);
    res.render("user/tickets/book", { event });
  } catch (error) {
    console.log("Error in ticketBooking", error);
  }
};
export const cancelTicket = (req, res) => {
  res.render("user/tickets/cancel");
};
export const viewTicket = (req, res) => {
  res.render("user/tickets/ticket");
};
