//admin
import { formatDate } from "../../utils/dateTimeFormator.js";
import { allEvents } from "../../service/admin/eventsService.js";

export const showEvents = async (req, res) => {
  const events = await allEvents();
  const pendingEvents = events.filter((e) => e.status == "pending");
  const approvedEvents = events.filter((e) => e.status == "approved");
  const rejectedEvents = events.filter((e) => e.status == "rejected");

  events.forEach((e) => {
    const { date } = formatDate(e.startDate);
    e.formatDate = date;
  });

  res.render("admin/events/dash", { events, pendingEvents, approvedEvents, rejectedEvents });
};
