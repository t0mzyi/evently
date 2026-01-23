import categoryDb from "../model/categoryDb.js";
import eventsDb from "../model/eventsDb.js";
import venueDb from "../model/venueDb.js";
import { formatDate } from "../utils/dateTimeFormator.js";

export const foryou = async (req, res) => {
  const allEvents = await eventsDb.find({ status: "approved", isBlocked: false }).populate("categoryId", "name");
  const allVenues = await venueDb.find();
  const featuredEvents = allEvents.filter((e) => e.isFeatured);
  const allCategories = await categoryDb.find();
  res.render("foryou", { featuredEvents, allEvents, allCategories, formatDate, allVenues });
};
