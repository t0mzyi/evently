// user/eventsController.js

import path from "path";
import fs from "fs";
import {
  allEvents,
  editEventRender,
  eventCreator,
  hostEventViewer,
  newEvent,
  singleEventFinder,
  updateEventer,
} from "../../service/user/eventsService.js";
import { formatDate } from "../../utils/dateTimeFormator.js";
import eventsDb from "../../model/eventsDb.js";
import { userBookmarks } from "../../service/user/bookmarksService.js";

export const showAllEvents = async (req, res) => {
  const query = req.query.q || "";
  const events = await allEvents(query);
  let bookmarks = false;
  if (req.session.user) {
    bookmarks = await userBookmarks(req.session.user);
  }
  return res.render("user/events/events", { events, q: query, userBookmarks: bookmarks.eventIds });
};

export const showSingleEvent = async (req, res) => {
  let eventId = req.params.eventId;
  const { event, venue, lowestPrice, totalTickets, ticketsLeft } = await singleEventFinder(eventId);
  const ticket = { lowestPrice, totalTickets, ticketsLeft };
  const schedule = formatDate(event.startDate);
  res.render("user/events/event-details", { event, venue, schedule, ticket });
};

export const showCreateEvent = async (req, res) => {
  try {
    const { categories, venues } = await eventCreator();
    res.render("user/events/create-event", { categories, venues });
  } catch (error) {
    console.error("Error loading create event page:", error);
    res.status(500).send("Unable to load event creation form.");
  }
};

export const createEvent = async (req, res) => {
  const uploadedFiles = [];
  try {
    if (!req.body || !req.session?.user) {
      return res.status(400).json({ success: false, message: "Missing required data." });
    }

    req.body.hostId = req.session.user;

    // Track uploaded files for cleanup on error
    if (req.files && req.files.length > 0) {
      uploadedFiles.push(...req.files.map((file) => path.join(file.destination, file.filename)));
    }

    const createdEvent = await newEvent(req.body, req.files);

    return res.status(201).json({
      success: true,
      message: "Event created!",
      eventId: createdEvent._id,
      redirectUrl: "/dashboard/hostDashboard?status=success&message=Event+created",
    });
  } catch (err) {
    console.error("Create event error:", err.message);

    // Cleanup uploaded files on error
    if (uploadedFiles.length > 0) {
      uploadedFiles.forEach((filePath) => {
        try {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`Deleted file: ${filePath}`);
          }
        } catch (unlinkErr) {
          console.error(`Failed to delete file ${filePath}:`, unlinkErr.message);
        }
      });
    }

    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        message: "File too large. Max size is 5MB.",
      });
    }

    return res.status(400).json({
      success: false,
      message: err.message || "Failed to create event.",
    });
  }
};

export const viewEventHost = async (req, res) => {
  try {
    const event = await hostEventViewer(req.session.user, req.params.eventId);

    res.render("user/events/view-event-active-host", { event });
  } catch (error) {
    console.log("error in view Event Host", error.message);
    res.redirect(`/dashboard?status=false&message=${error.message}`);
  }
};

export const editEvent = async (req, res) => {
  try {
    const userId = req.session.user;
    const eventId = req.params.eventId;
    if (!userId && !eventId) {
      res.redirect(`/dashboard?status=false&message=Event or User error`);
    }
    const data = await editEventRender(userId, eventId);
    res.render("user/events/edit-event", { event: data.event, categories: data.categories, venues: data.venues });
  } catch (error) {
    console.log(error);
  }
};

export const updateEvent = async (req, res) => {
  try {
    const eventId = req.params.eventId;
    const userId = req.session.user;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    if (!eventId) {
      return res.status(400).json({ success: false, message: "Event ID missing" });
    }

    const currentEvent = await eventsDb.findById(eventId);
    if (!currentEvent) {
      return res.status(404).json({ success: false, message: "Event not found" });
    }
    const names = Array.isArray(req.body.ticket_name) ? req.body.ticket_name : [];
    const prices = Array.isArray(req.body.ticket_price) ? req.body.ticket_price : [];
    const qtys = Array.isArray(req.body.ticket_quantityTotal) ? req.body.ticket_quantityTotal : [];

    const ticketTypes = [];
    const maxLength = Math.max(names.length, prices.length, qtys.length);

    for (let i = 0; i < maxLength; i++) {
      const name = (names[i] || "").trim();
      const price = parseFloat(prices[i]) || 0;
      const qty = parseInt(qtys[i]) || 0;

      if (name && qty > 0) {
        const existingTicket = currentEvent.ticketTypes?.[i];
        const quantityAvailable =
          existingTicket?.quantityAvailable !== undefined ? existingTicket.quantityAvailable : qty;

        ticketTypes.push({
          name,
          price,
          quantityTotal: qty,
          quantityAvailable,
          isFree: price === 0,
          description: "",
        });
      }
    }

    const body = {
      ...req.body,
      ticketTypes,
    };
    delete body.ticket_name;
    delete body.ticket_price;
    delete body.ticket_quantityTotal;

    // Call service
    const updatedEvent = await updateEventer(userId, eventId, body, req.files || []);

    if (updatedEvent) {
      return res.json({
        success: true,
        message: "Event updated successfully",
        event: updatedEvent,
      });
    }

    return res.status(500).json({ success: false, message: "Unknown error" });
  } catch (error) {
    console.error("Error in update event controller:", error);
    return res.status(400).json({ success: false, message: error.message });
  }
};
