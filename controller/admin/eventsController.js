//admin
import { formatDate } from "../../utils/dateTimeFormator.js";
import {
  allEvents,
  eventFeaturer,
  eventUnFeaturer,
  singleEvent,
  statusChanger,
} from "../../service/admin/eventsService.js";

export const showEvents = async (req, res) => {
  try {
    const page = parseInt(req.query.p) || 1;
    const search = req.query.n || "";
    const type = req.query.t;
    const sort = req.query.s || "name-asc";

    const eventDetails = await allEvents(page, search, type, sort);
    const events = eventDetails.events;
    events.forEach((e) => {
      const { date } = formatDate(e.startDate);
      e.formatDate = date;
    });

    res.render("admin/events/events", {
      events,
      pendingEvents: eventDetails.pendingEvents,
      approvedEvents: eventDetails.approvedEvents,
      rejectedEvents: eventDetails.rejectedEvents,
      totalEvents: eventDetails.totalEvents,
      totalPages: eventDetails.totalPages,
      currentPage: eventDetails.currentPage,
      searchQuery: eventDetails.searchQuery,
      selectedType: eventDetails.selectedType, // This is the status filter
      selectedSort: eventDetails.selectedSort,
    });
  } catch (error) {
    console.log("error in eventController", error);
  }
};

export const showSingleEvent = async (req, res) => {
  try {
    const eventId = req.params.eventId;
    const { event, venueDetails } = await singleEvent(eventId);

    const date = formatDate(event.createdAt);
    const start = formatDate(event.startDate);
    const end = formatDate(event.endDate);

    event.formatedDate = date.date;
    event.Sdate = start.date;
    event.Stime = start.time;
    event.Edate = end.date;
    event.Etime = end.time;
    const total = event.ticketTypes.reduce((acc, t) => (acc += t.quantityTotal), 0);
    const available = event.ticketTypes.reduce((acc, t) => (acc += t.quantityAvailable), 0);
    const sold = total - available;
    const ticket = { total, available, sold };

    res.render("admin/events/viewEvents", { event, venueDetails, ticket });
  } catch (error) {
    console.log("error", error);
  }
};

export const featureEvent = async (req, res) => {
  try {
    const eventId = req.params.eventId;
    const date = req.body.featuredUntil;
    if (!eventId && !date) {
      return res.status(500).json({
        success: false,
        message: "date / eventId missing",
      });
    }

    const nowDate = new Date();
    if (date < nowDate) {
      return res.status(500).json({
        success: false,
        message: "Date cannot be in past",
      });
    }

    await eventFeaturer(eventId, date);

    return res.status(201).json({
      success: true,
      redirectUrl: `/admin/events/${eventId}?status=true&message=Event successfully Featured`,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ success: false });
  }
};

export const unFeatureEvent = async (req, res) => {
  try {
    const eventId = req.params.eventId;
    if (!eventId) {
      return res.status(500).json({
        success: false,
        message: "eventId missing",
      });
    }
    await eventUnFeaturer(eventId);
    return res.status(201).json({
      success: true,
      redirectUrl: `/admin/events/${eventId}?status=true&message=Event successfully unFeatured`,
    });
  } catch (error) {
    return res.status(500).json({ success: false });
  }
};

export const approveEvent = async (req, res) => {
  try {
    const eventId = req.params.eventId;
    if (!eventId) {
      return res.status(500).json({
        success: false,
        message: "eventId missing",
      });
    }
    await statusChanger(eventId, "approved");
    return res.status(201).json({
      success: true,
      redirectUrl: `/admin/events/${eventId}?status=true&message=Event successfully approved`,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false });
  }
};
export const rejectEvent = async (req, res) => {
  try {
    const eventId = req.params.eventId;
    const reason = req.body.reason;
    if (!eventId) {
      return res.status(500).json({
        success: false,
        message: "eventId missing",
      });
    }
    await statusChanger(eventId, "rejected", reason);
    return res.status(201).json({
      success: true,
      redirectUrl: `/admin/events/${eventId}?status=true&message=Event successfully rejected`,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false });
  }
};
