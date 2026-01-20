import categoryDb from "../../model/categoryDb.js";
import eventsDb from "../../model/eventsDb.js";
import userDb from "../../model/userDb.js";
import venueDb from "../../model/venueDb.js";
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
    totalCapacity,
    isFree,
    hostId,
    venueId,
    custom_name,
    custom_address,
    custom_city,
    custom_state,
    custom_mapLink,
  } = body;

  // Validation
  if (!title || !startDate || !endDate || !description || !categoryId || !venueType || !hostId) {
    throw new Error("Missing required fields");
  }
  console.log("heyeye", isFree);

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new Error("Invalid date format");
  }

  if (end <= start) {
    throw new Error("End date must be after start date");
  }

  const diffInHours = (end - start) / (1000 * 60 * 60);
  if (diffInHours < 1) {
    throw new Error("Event must be at least 1 hour long");
  }
  if (diffInHours > 24) {
    throw new Error("Events cannot be more than 24 hour");
  }

  const galleryImages = files?.map((file) => `/uploads/events/${file.filename}`) || [];
  if (galleryImages.length === 0) {
    throw new Error("Add at least one image");
  }

  // Base event
  const event = {
    hostId,
    title,
    description,
    startDate: start,
    endDate: end,
    venueType,
    galleryImages,
    isFree: isFree === "true",
    ticketTypes: [],
    totalCapacity: 0,
    categoryId,
  };

  // Venue
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

  // Capacity & Tickets
  if (isFree === "true") {
    const cap = parseInt(totalCapacity);
    if (isNaN(cap) || cap <= 0) {
      throw new Error("Total capacity must be a positive number for free events.");
    }
    event.totalCapacity = cap;
  } else {
    const names = Array.isArray(body["ticket_name[]"]) ? body["ticket_name[]"] : [body["ticket_name[]"]];
    const prices = Array.isArray(body["ticket_price[]"]) ? body["ticket_price[]"] : [body["ticket_price[]"]];
    const qtys = Array.isArray(body["ticket_quantityTotal[]"])
      ? body["ticket_quantityTotal[]"]
      : [body["ticket_quantityTotal[]"]];

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
        isFree: price === 0,
      });
      totalCapacityFromTickets += qty;
    }

    if (ticketTypes.length === 0) {
      throw new Error("At least one valid ticket type is required.");
    }

    event.ticketTypes = ticketTypes;
    event.totalCapacity = totalCapacityFromTickets;
  }
  console.log(event);
  const newEventDoc = new eventsDb(event);
  await newEventDoc.save();
  await userDb.findByIdAndUpdate(body.hostId, { $set: { isHost: true }, $push: { hostedEvents: newEventDoc._id } });
  return newEventDoc;
};
