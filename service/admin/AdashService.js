import eventsDb from "../../model/eventsDb.js";
import userDb from "../../model/userDb.js";

export const userDetails = async () => {
  const blockedUsers = await userDb.countDocuments({ isBlocked: true });
  const activeUsers = await userDb.countDocuments({ isBlocked: false });
  const hosts = await userDb.countDocuments({ isHost: true });
  const users = await userDb.find({});
  const totalUsers = activeUsers + blockedUsers;

  return { blockedUsers, activeUsers, totalUsers, hosts, users };
};

export const eventDetails = async () => {
  const totalEvents = await eventsDb.countDocuments({});

  return { totalEvents };
};
