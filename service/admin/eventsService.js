import eventsDb from "../../model/eventsDb.js";

export const allEvents = async () => {
  const events = await eventsDb.find().populate("categoryId", "name").populate("hostId", "firstName lastName");

  return events;
};
