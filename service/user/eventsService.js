// service/user/eventsService.js

import { bookmarksDb } from "../../model/bookmarksDb.js";
import categoryDb from "../../model/categoryDb.js";
import eventsDb from "../../model/eventsDb.js";
import userDb from "../../model/userDb.js";
import venueDb from "../../model/venueDb.js";
import walletDb from "../../model/walletDb.js";
import { formatDate } from "../../utils/dateTimeFormator.js";
import { venueDetails } from "./venueService.js";
import { debitWallet } from "./walletService.js";

export const allEvents = async (
  query,
  page = 1,
  limit = 9,
  sortBy = "date",
  order = "desc",
  categoryFilter = "all",
) => {
  try {
    // Build query filter
    let queryFilter = { status: "live" };

    // Search filter
    if (query.trim()) {
      const searchRegex = new RegExp(query.trim(), "i");
      queryFilter.$or = [{ title: { $regex: searchRegex } }, { description: { $regex: searchRegex } }];
    }

    // Category filter
    if (categoryFilter !== "all") {
      queryFilter.categoryId = categoryFilter;
    }

    // Calculate skip value for pagination
    const skip = (page - 1) * limit;

    // Get total count for pagination
    const totalEvents = await eventsDb.countDocuments(queryFilter);

    // Build sort options
    let sortOptions = {};
    switch (sortBy) {
      case "date":
        sortOptions = { startDate: order === "asc" ? 1 : -1 };
        break;
      case "name":
        sortOptions = { title: order === "asc" ? 1 : -1 };
        break;
      default:
        sortOptions = { startDate: order === "asc" ? 1 : -1 };
    }

    // Fetch events with basic population
    let events = await eventsDb
      .find(queryFilter)
      .sort(sortOptions)
      .skip(skip)
      .limit(limit)
      .populate("categoryId", "name")
      .populate({
        path: "venueId",
        select: "name address city ",
        match: { status: "active" },
      })
      .lean();

    // Process each event in JavaScript
    const processedEvents = events.map((event) => {
      let venueInfo = {
        name: "TBD",
        address: "",
      };

      if (event.venueType === "custom" && event.venueDetails) {
        venueInfo = {
          name: event.venueDetails.name,
          address: event.venueDetails.address,
          city: event.venueDetails.city,
        };
      } else if (event.venueId) {
        venueInfo = {
          name: event.venueId.name || "Venue",
          address: event.venueId.address || "",
          city: event.venueId.city || "",
        };
      }

      let minPrice = 50;
      let maxPrice = 50;
      let hasFreeTickets = false;

      if (event.ticketTypes && event.ticketTypes.length > 0) {
        // Filter active tickets
        const activeTickets = event.ticketTypes.filter((t) => t.isActive);

        // Separate free and paid tickets
        const freeTickets = activeTickets.filter((t) => t.isFree || t.price === 0);
        const paidTickets = activeTickets.filter((t) => !t.isFree && t.price > 0);

        if (freeTickets.length > 0) {
          hasFreeTickets = true;
          minPrice = 0;
        }

        if (paidTickets.length > 0) {
          const prices = paidTickets.map((t) => t.price);
          minPrice = hasFreeTickets ? 0 : Math.min(...prices);
          maxPrice = Math.max(...prices);
        } else if (!hasFreeTickets) {
          // No active paid tickets and no free tickets
          minPrice = 50; // fallback
          maxPrice = 50;
        }
      }

      // Format price display
      const priceDisplay =
        hasFreeTickets && maxPrice > 0
          ? "FREE" // If there's at least one free ticket
          : minPrice === 0
            ? "FREE"
            : minPrice === maxPrice
              ? `$${minPrice}`
              : `$${minPrice} - $${maxPrice}`;

      const startDate = new Date(event.startDate);
      const endDate = event.endDate ? new Date(event.endDate) : null;

      let dateDisplay = startDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });

      if (endDate && endDate.getTime() !== startDate.getTime()) {
        if (startDate.getFullYear() === endDate.getFullYear()) {
          if (startDate.getMonth() === endDate.getMonth()) {
            dateDisplay = `${startDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${endDate.getDate()}, ${endDate.getFullYear()}`;
          } else {
            dateDisplay = `${startDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${endDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
          }
        } else {
          dateDisplay = `${startDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} - ${endDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
        }
      }

      return {
        _id: event._id,
        title: event.title,
        description: event.description,
        startDate: event.startDate,
        endDate: event.endDate,
        galleryImages: event.galleryImages || [],
        status: event.status,
        categoryId: event.categoryId,
        venue: venueInfo,
        minPrice: minPrice,
        maxPrice: maxPrice,
        priceDisplay: priceDisplay,
        dateDisplay: dateDisplay,
        hasFreeTickets: hasFreeTickets,
        ticketCount: event.ticketTypes ? event.ticketTypes.length : 0,
      };
    });

    if (sortBy === "price") {
      processedEvents.sort((a, b) => {
        if (order === "asc") {
          return a.minPrice - b.minPrice;
        } else {
          return b.minPrice - a.minPrice;
        }
      });
    }

    return { events: processedEvents, totalEvents };
  } catch (error) {
    console.error("Error in allEvents service:", error);
    throw error;
  }
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
    const venue = await venueDb.findById(venueId);
    if (!venue) throw new Error("Venue not found");
    const eventStartDateStr = start.toISOString().split("T")[0];
    const eventEndDateStr = end.toISOString().split("T")[0];
    for (const bookedSlot of venue.bookedOn) {
      const bookedDate = new Date(bookedSlot);
      const bookedDateStr = bookedDate.toISOString().split("T")[0];
      if (bookedDateStr === eventStartDateStr || bookedDateStr === eventEndDateStr) {
        throw new Error(`Venue is already booked on ${bookedDateStr}. Please select different dates.`);
      }
    }
    await venueDb.findByIdAndUpdate(venueId, {
      $push: {
        bookedOn: {
          $each: [start, end],
        },
      },
    });
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

  // Sanitize & validate ticket types
  if (body.ticketTypes && Array.isArray(body.ticketTypes)) {
    body.ticketTypes = body.ticketTypes
      .filter((ticket) => ticket.name && ticket.quantityTotal > 0)
      .map((ticket) => {
        const qtyTotal = parseInt(ticket.quantityTotal) || 0;
        return {
          name: ticket.name.trim(),
          price: parseFloat(ticket.price) || 0,
          quantityTotal: qtyTotal,
          quantityAvailable: ticket.quantityAvailable ?? qtyTotal, // ✅ safe & clear
          isFree: ticket.isFree || false,
          description: ticket.description || "",
        };
      });
  }

  // Auto-reset status if previously rejected
  if (currentEvent.status === "rejected") {
    body.status = "pending";
    body.rejectionReason = "";
  }

  const updatedEvent = await eventsDb.findByIdAndUpdate(eventId, body, { new: true, runValidators: true });

  return updatedEvent;
};

export const payEventRender = async (eventId, userId) => {
  const event = await eventsDb.findById(eventId);
  if (!event) throw new Error("Event not found");
  if (event.hostId != userId) throw new Error("Unauthorised");
  if (event.status == "live") throw new Error("Event is already live");

  const wallet = await walletDb.findOne({ userId: event.hostId });
  const walletBalance = wallet.availableBalance.toString();
  const hours = (event.endDate - event.startDate) / (1000 * 60 * 60);
  let venueFee = 0;
  if (event.venueType == "custom") venueFee = 0;
  else {
    const venue = await venueDb.findById(event.venueId);
    const pricePerHour = venue.costPerHour;
    venueFee = pricePerHour * hours;
  }

  // console.log(walletBalance);
  const eventFee = hours * 4;
  return { event, walletBalance, venueFee, eventFee };
};

export const payAndPublishEvent = async (eventId, userId) => {
  const event = await eventsDb.findById(eventId);
  if (!event) throw new Error("Event not found");
  if (event.hostId.toString() !== userId) {
    throw new Error("Unauthorized");
  }
  if (event.status === "live") {
    throw new Error("Event is already live");
  }
  const wallet = await walletDb.findOne({ userId: event.hostId });
  if (!wallet) throw new Error("Wallet not found");

  const walletBalance = wallet.availableBalance.toString();

  // Calculate fees
  const hours = (event.endDate - event.startDate) / (1000 * 60 * 60);
  let venueFee = 0;

  if (event.venueType !== "custom") {
    const venue = await venueDb.findById(event.venueId);
    if (!venue) throw new Error("Venue not found");
    venueFee = venue.costPerHour * hours;
  }

  const eventFee = hours * 4;
  const totalAmount = venueFee + eventFee;

  if (walletBalance < totalAmount) {
    throw new Error(
      `Insufficient balance. Required: $${totalAmount.toFixed(2)}, Available: $${walletBalance.toFixed(2)}`,
    );
  }

  try {
    // Debit wallet
    const debitResult = await debitWallet(event.hostId, totalAmount, "Event publishing fees");

    event.status = "live";
    event.publishedAt = new Date();
    await event.save();

    return {
      newBalance: walletBalance - totalAmount,
      transactionId: debitResult.transactionId,
      totalAmount,
      venueFee,
      eventFee,
    };
  } catch (error) {
    throw new Error(`Payment failed: ${error.message}`);
  }
};
