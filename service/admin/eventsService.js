import eventsDb from "../../model/eventsDb.js";
import userDb from "../../model/userDb.js";
import venueDb from "../../model/venueDb.js";

export const allEvents = async (page, search, type, sortQuery) => {
  const limit = 1;
  const filter = {};
  if (search) {
    filter.title = { $regex: search, $options: "i" };
  }
  if (type && type != "all") {
    filter.status = type;
  }
  let sort = {};
  if (sortQuery == "name-asc") sort = { title: 1 };
  else if (sortQuery == "name-desc") sort = { title: -1 };
  else if (sortQuery == "createdAt-asc") sort = { createdAt: 1 };
  else if (sortQuery == "createdAt-desc") sort = { createdAt: -1 };

  const [totalEvents, pendingEvents, approvedEvents, rejectedEvents, events] = await Promise.all([
    eventsDb.countDocuments(filter),
    eventsDb.countDocuments({ status: "pending" }),
    eventsDb.countDocuments({ status: "approved" }),
    eventsDb.countDocuments({ status: "rejected" }),
    eventsDb
      .find(filter)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("categoryId", "name")
      .populate("hostId", "firstName lastName"),
  ]);

  const totalPages = Math.ceil(totalEvents / limit);
  return {
    pendingEvents,
    approvedEvents,
    rejectedEvents,
    totalEvents,
    events,
    totalPages,
    currentPage: parseInt(page),
    searchQuery: search,
    selectedType: type,
    selectedSort: sortQuery,
  };
};

export const singleEvent = async (eventId) => {
  const event = await eventsDb
    .findById(eventId)
    .populate("categoryId", "name")
    .populate("hostId", "firstName lastName avatarUrl emailAddress");
  let venueDetails = {};
  if (event.venueType == "iconic") {
    venueDetails = await venueDb.findById(event.venueId);
  } else if (event.venueType == "custom") {
    venueDetails = event.venueDetails;
  }
  return { event, venueDetails };
};

export const eventFeaturer = async (eventId, date) => {
  const event = await eventsDb.findByIdAndUpdate(eventId, { isFeatured: true, featuredUntil: date });
  if (!event) {
    throw new Error("Invalid eventId or some Error");
  }
  return event;
};
export const eventUnFeaturer = async (eventId) => {
  const event = await eventsDb.findByIdAndUpdate(eventId, { isFeatured: false, featuredUntil: null });
  if (!event) {
    throw new Error("Invalid eventId : updating failed");
  }
};

export const statusChanger = async (eventId, eventStatus, reason) => {
  let updatedEvent;
  if (reason) {
    updatedEvent = await eventsDb.findByIdAndUpdate(eventId, { status: eventStatus, rejectionReason: reason });
  } else {
    updatedEvent = await eventsDb.findByIdAndUpdate(eventId, { status: eventStatus });
  }
  if (!updatedEvent) throw new Error("Invalid eventId : updation failed");
};
