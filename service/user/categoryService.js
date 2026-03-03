import categoryDb from "../../model/categoryDb.js";
import eventsDb from "../../model/eventsDb.js";

export const addEvent = async (eventId) => {
  const event = await eventsDb.findById(eventId);
  if (!event) {
    throw new Error("No such event");
  }

  const result = await categoryDb.updateOne({ _id: event.categoryId }, { $addToSet: { events: event._id } });

  if (result.matchedCount === 0) {
    throw new Error("Category not found");
  }

  return result;
};
