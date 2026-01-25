import cron from "node-cron";
import eventsDb from "../model/eventsDb.js";

// Cron schedule: run every minute
cron.schedule("0 0 * * *", async () => {
  console.log(`[${new Date().toISOString()}] Running unfeatureExpiredEvents cron job`);

  try {
    const now = new Date();

    const expiredEvents = await eventsDb.find({ isFeatured: true, featuredUntil: { $lt: now } }, { _id: 1 });

    if (expiredEvents.length === 0) {
      console.log("No events to unfeature.");
      return;
    }

    const eventIds = expiredEvents.map((e) => e._id);

    // Update all expired events
    await eventsDb.updateMany({ _id: { $in: eventIds } }, { isFeatured: false, featuredUntil: null });

    console.log(`Unfeatured expired events: ${eventIds.join(", ")}`);
  } catch (err) {
    console.error("Error running unfeatureExpiredEvents cron job:", err);
  }
});
