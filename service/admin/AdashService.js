import eventsDb from "../../model/eventsDb.js";
import userDb from "../../model/userDb.js";

export const userDetails = async (page, searchQuery, sort, onlyActive) => {
  const limits = 1;

  const filter = {};
  if (searchQuery) {
    filter.$or = [
      { firstName: { $regex: searchQuery, $options: "i" } },
      { lastName: { $regex: searchQuery, $options: "i" } },
    ];
  }
  console.log(onlyActive);
  if (onlyActive == "true") filter.isBlocked = false;

  let sortOptions = { firstName: 1 };
  if (sort == "newest") sortOptions = { createdAt: -1 };
  else if (sort == "oldest") sortOptions = { createdAt: 1 };
  else if (sort == "name-asc") sortOptions = { firstName: 1 };
  else if (sort == "name-desc") sortOptions = { firstName: -1 };
  const [blockedUsers, activeUsers, hosts, users, totalFilteredUser] =
    await Promise.all([
      userDb.countDocuments({ isBlocked: true }),
      userDb.countDocuments({ isBlocked: false }),
      userDb.countDocuments({ isHost: true }),
      userDb
        .find(filter)
        .sort(sortOptions)
        .skip((page - 1) * limits)
        .limit(limits),
      userDb.countDocuments(filter),
    ]);

  return {
    blockedUsers,
    activeUsers,
    totalUsers: activeUsers + blockedUsers,
    hosts,
    users,
    totalPages: Math.ceil(totalFilteredUser / limits),
    currentPage: parseInt(page),
    searchQuery,
    selectedSort: sort,
    showActiveOnly: onlyActive,
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
