import { bookmarksDb } from "../../model/bookmarksDb.js";
import eventsDb from "../../model/eventsDb.js";

export const userBookmarks = async (id) => {
  const bookmarks = await bookmarksDb.find({ userId: id });
  const eventIds = bookmarks.map((bm) => bm.eventId.toString());
  const events = await eventsDb.find({ _id: { $in: eventIds } }).populate("categoryId", "name");
  return { eventIds, events };
};

export const bookmarksToggler = async (eventId, userId) => {
  const exisiting = await bookmarksDb.findOne({ userId, eventId });
  if (exisiting) {
    await bookmarksDb.deleteOne({ _id: exisiting._id });
    return { action: "Removed" };
  } else {
    await bookmarksDb.create({ userId: userId, eventId: eventId });
    return { action: "Added" };
  }
};
