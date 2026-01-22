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

export const showAllEvents = async (req, res) => {
  const events = await allEvents();
  res.render("user/events/events", { events });
};

export const showSingleEvent = async (req, res) => {
  let eventId = req.params.eventId;
  const { event, venue, lowestPrice, totalTickets, ticketsLeft } = await singleEventFinder(eventId);
  const schedule = formatDate(event.startDate);
  res.render("user/events/event-details", { event, venue, schedule, lowestPrice, totalTickets, ticketsLeft });
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
    if (!userId && !eventId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const updatedEvent = await updateEventer(userId, eventId, req.body, req.files || []);
    if (updatedEvent) {
      return res.json({
        success: true,
        message: "Event updated successfully",
        event: updatedEvent,
      });
    }
    return res.status(403).json({ success: false, message: "Some error" });
  } catch (error) {
    console.log("error in update event controller", error);
    return res.status(403).json({ success: false, message: error.message });
  }
};
