import eventsDb from "../../model/eventsDb.js";
import userDb from "../../model/userDb.js";

export const userDetails = async (page = 1) => {
  const blockedUsers = await userDb.countDocuments({ isBlocked: true });
  const activeUsers = await userDb.countDocuments({ isBlocked: false });
  const hosts = await userDb.countDocuments({ isHost: true });
  const users = await userDb
    .find()
    .sort({ createdAt: -1 })
    .skip((page - 1) * 3)
    .limit(3);
  const totalUsers = activeUsers + blockedUsers;
  const totalPages = Math.ceil(totalUsers / 3);

  return {
    blockedUsers,
    activeUsers,
    totalUsers,
    hosts,
    users,
    totalPages,
    currentPage: parseInt(page),
  };
};

export const eventDetails = async () => {
  const totalEvents = await eventsDb.countDocuments({});

  return { totalEvents };
};

export const blockAndUnblock = async (userId, action) => {
  let value;
  if (action == "block") {
    value = true;
  } else if (action == "unblock") {
    value = false;
  } else {
    throw new Error("wrong action");
  }

  const user = await userDb.findByIdAndUpdate(userId, { isBlocked: value });

  if (!user) {
    throw new Error("user not found / action failed");
  }

  return user;
};

export const userProfile = async (userId) => {
  console.log(userId);
  const user = await userDb.findById(userId);
  console.log(user);
  if (!user) {
    throw new Error("User doesn't exists");
  }
  return user;
};
