// service/user/eventsService.js

import categoryDb from "../../model/categoryDb.js";
import eventsDb from "../../model/eventsDb.js";
import userDb from "../../model/userDb.js";
import venueDb from "../../model/venueDb.js";
import { formatDate } from "../../utils/dateTimeFormator.js";
import { venueDetails } from "./venueService.js";

export const allEvents = async () => {
  const events = await eventsDb.find({ status: "approved" }).populate("categoryId", "name");
  return events;
};

export const singleEventFinder = async (eventId) => {
  const event = await eventsDb.findById(eventId).populate("categoryId", "name");
  if (!event) throw new Error("Event not found");

  let venue;
  if (event.venueType === "iconic") {
    venue = await venueDetails(event.venueId);
  } else {
    venue = event.venueDetails;
  }

  let lowestPrice = 0;
  if (event.ticketTypes && event.ticketTypes.length > 0) {
    lowestPrice = Math.min(...event.ticketTypes.map((t) => t.price));
  }

  const totalTickets = event.ticketTypes.reduce((acc, t) => acc + t.quantityTotal, 0);
  const ticketsLeft = event.ticketTypes.reduce((acc, t) => acc + t.quantityAvailable, 0);

  return { event, venue, lowestPrice, totalTickets, ticketsLeft };
};

export const eventCreator = async () => {
  const categories = await categoryDb.find();
  const venues = await venueDb.find();
  return { categories, venues };
};

export const newEvent = async (body, files) => {
  const {
    title,
    description,
    categoryId,
    startDate,
    endDate,
    venueType,
    hostId,
    venueId,
    custom_name,
    custom_address,
    custom_city,
    custom_state,
    custom_mapLink,
    ticket_name,
    ticket_price,
    ticket_quantityTotal,
  } = body;

  // Validation
  if (!title || !startDate || !endDate || !description || !categoryId || !venueType || !hostId) {
    throw new Error("Missing required fields");
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new Error("Invalid date format");
  }

  if (end <= start) {
    throw new Error("End date must be after start date");
  }

  const diffInHours = (end - start) / (1000 * 60 * 60);
  if (diffInHours < 1) throw new Error("Event must be at least 1 hour long");
  if (diffInHours > 24) throw new Error("Events cannot be more than 24 hours long");

  const galleryImages = files?.map((file) => `/uploads/events/${file.filename}`) || [];
  if (galleryImages.length === 0) {
    throw new Error("Add at least one image");
  }

  // Process tickets
  const names = Array.isArray(ticket_name) ? ticket_name : ticket_name ? [ticket_name] : [];
  const prices = Array.isArray(ticket_price) ? ticket_price : ticket_price ? [ticket_price] : [];
  const qtys = Array.isArray(ticket_quantityTotal)
    ? ticket_quantityTotal
    : ticket_quantityTotal
      ? [ticket_quantityTotal]
      : [];

  if (names.length === 0) throw new Error("At least one ticket type is required");

  let totalCapacityFromTickets = 0;
  const ticketTypes = [];

  for (let i = 0; i < names.length; i++) {
    const name = (names[i] || "").trim();
    if (!name) continue;

    const price = parseFloat(prices[i]) || 0;
    const qty = parseInt(qtys[i]) || 0;
    if (qty <= 0) continue;

    ticketTypes.push({
      name,
      price,
      quantityTotal: qty,
      quantityAvailable: qty,
      isFree: price === 0, // ✅ This is what you wanted!
    });
    totalCapacityFromTickets += qty;
  }

  if (ticketTypes.length === 0) {
    throw new Error("At least one valid ticket type is required.");
  }

  // Build event
  const event = {
    hostId,
    title,
    description,
    startDate: start,
    endDate: end,
    venueType,
    galleryImages,
    categoryId,
    ticketTypes,
    totalCapacity: totalCapacityFromTickets,
  };

  // Handle venue
  if (venueType === "iconic") {
    if (!venueId) throw new Error("Venue selection error");
    event.venueId = venueId;
  } else if (venueType === "custom") {
    if (!custom_name || !custom_address || !custom_city || !custom_state) {
      throw new Error("Custom venue details incomplete");
    }
    event.venueDetails = {
      name: custom_name,
      address: custom_address,
      city: custom_city,
      state: custom_state,
      mapLink: custom_mapLink || "",
    };
  }

  const newEventDoc = new eventsDb(event);
  await newEventDoc.save();
  await userDb.findByIdAndUpdate(hostId, { $set: { isHost: true }, $push: { hostedEvents: newEventDoc._id } });
  return newEventDoc;
};

export const hostEventViewer = async (userId, eventId) => {
  if (!userId && !eventId) {
    throw new Error("No user Id and Event Id");
  }
  const user = await userDb.findById(userId);
  if (!user) {
    throw new Error("User didnt Exists");
  }
  const validEvent = user.hostedEvents.find((event) => event.toString() === eventId);
  if (!validEvent) {
    throw new Error("Event doest exist or you dont have acces");
  }
  const event = await eventsDb.findById(validEvent);
  const formattedStartDate = formatDate(event.startDate);
  const formattedEndDate = formatDate(event.endDate);
  event.sDate = formattedStartDate;
  event.eDate = formattedEndDate;

  if (event.venueType == "iconic") {
    console.log("id", event.venueId);
    const venue = await venueDb.findById(event.venueId);
    event.venueDetails = venue;
    console.log(venue.description);
  }
  return event;
};

export const editEventRender = async (userId, eventId) => {
  const user = await userDb.findById(userId);
  if (!user) {
    throw new Error("User didnt Exists");
  }
  const validEvent = user.hostedEvents.find((event) => event.toString() === eventId);
  if (!validEvent) {
    throw new Error("Event doest exist or you dont have acces");
  }
  const event = await eventsDb.findById(validEvent);
  const categories = await categoryDb.find();
  const venues = await venueDb.find();
  console.log(event);
  return { event, categories, venues };
};

export const updateEventer = async (userId, eventId, body, uploadedFiles = []) => {
  const currentEvent = await eventsDb.findById(eventId);
  if (!currentEvent) {
    throw new Error("Event does not exist");
  }

  const user = await userDb.findById(userId);
  if (!user || !user.hostedEvents.some((e) => e.equals(eventId))) {
    throw new Error("Access Denied");
  }

  const isApproved = currentEvent.status === "approved";
  if (isApproved) {
    delete body.startDate;
    delete body.endDate;
    delete body.venueId;

    if (body.ticketTypes && Array.isArray(body.ticketTypes)) {
      body.ticketTypes = body.ticketTypes.map((newTicket, idx) => {
        const existing = currentEvent.ticketTypes[idx];
        if (existing) {
          return {
            ...newTicket,
            price: existing.price,
            isFree: existing.isFree,
          };
        }
        return newTicket;
      });
    }
  }

  if (body.totalCapacity !== undefined) {
    const newCapacity = parseInt(body.totalCapacity);
    const currentSold = currentEvent.ticketsSold || 0;
    if (newCapacity < currentSold) {
      throw new Error(`Total capacity cannot be less than tickets already sold (${currentSold}).`);
    }
  }

  let allImagePaths = [];

  if (typeof body.existingGalleryImages === "string") {
    try {
      allImagePaths = JSON.parse(body.existingGalleryImages);
    } catch (e) {
      console.warn("Failed to parse existingGalleryImages, using fallback");
      allImagePaths = [...(currentEvent.galleryImages || [])];
    }
  } else {
    allImagePaths = [...(currentEvent.galleryImages || [])];
  }

  if (uploadedFiles.length > 0) {
    const newImagePaths = uploadedFiles.map((file) => `/uploads/events/${file.filename}`);
    allImagePaths.push(...newImagePaths);
  }

  body.galleryImages = allImagePaths;

  if (body.ticketTypes && Array.isArray(body.ticketTypes)) {
    body.ticketTypes = body.ticketTypes
      .filter((ticket) => ticket.name && ticket.quantityTotal > 0)
      .map((ticket) => ({
        name: ticket.name.trim(),
        price: parseFloat(ticket.price) || 0,
        quantityTotal: parseInt(ticket.quantityTotal) || 0,
        isFree: ticket.isFree || false,
        description: ticket.description || "",
      }));
  }

  if (currentEvent.status === "rejected") {
    body.status = "pending";
    body.rejectionReason = "";
  }

  const updatedEvent = await eventsDb.findByIdAndUpdate(eventId, body, { new: true, runValidators: true });
  return updatedEvent;
};
