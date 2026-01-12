import eventsDb from "../../model/eventsDb.js";
import userDb from "../../model/userDb.js";

export const userDetails = async (page, searchQuery) => {
  const limits = 1;

  const filter = {};
  if (searchQuery) {
    filter.$or = [
      { firstName: { $regex: searchQuery, $options: "i" } },
      { lastName: { $regex: searchQuery, $options: "i" } },
    ];
  }
  const [blockedUsers, activeUsers, hosts, users, totalFilteredUser] =
    await Promise.all([
      userDb.countDocuments({ isBlocked: true }),
      userDb.countDocuments({ isBlocked: false }),
      userDb.countDocuments({ isHost: true }),
      userDb
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limits)
        .limit(limits),
      userDb.countDocuments(filter),
    ]);

  const totalPages = Math.ceil(totalFilteredUser / limits);

  return {
    blockedUsers,
    activeUsers,
    totalUsers: activeUsers + blockedUsers,
    hosts,
    users,
    totalPages,
    currentPage: parseInt(page),
    searchQuery,
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
