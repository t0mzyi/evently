import userDb from "../../model/userDb.js";
import venueDb from "../../model/venueDb.js";
import { formatDate } from "../../utils/dateTimeFormator.js";

export const updateProfileService = async (updateData, userId) => {
  try {
    return await userDb.findByIdAndUpdate(userId, { $set: updateData }, { new: true });
  } catch (err) {
    throw new Error("error in updateProfileService", err.message);
  }
};

export const userFinder = async (userId) => {
  if (!userId) {
    throw new Error("Session expired");
  }

  let user = await userDb.findById(userId);
  if (!user) {
    throw new Error("User not found");
  }

  if (user.isHost) {
    user = await userDb.findById(userId).populate("hostedEvents");
    user.hostedEvents.forEach((e) => {
      e.formattedDate = formatDate(e.startDate);
    });
    const iconicEvents = user.hostedEvents.filter((e) => e.venueType === "iconic");
    if (iconicEvents.length > 0) {
      const venuePromises = iconicEvents.map((event) => venueDb.findById(event.venueId).lean());
      const venues = await Promise.all(venuePromises);
      iconicEvents.forEach((event, index) => {
        event.venueDetails = venues[index] || null;
      });
    }
    user.hostedEvents.forEach((e) => {
      const remaining = e.ticketTypes.reduce((acc, t) => (acc += t.quantityAvailable), 0);
      const total = e.ticketTypes.reduce((acc, t) => (acc += t.quantityTotal), 0);
      const sold = total - remaining;
      const tickets = { remaining, total, sold };
      e.tickets = tickets;
    });
  }

  return user;
};
