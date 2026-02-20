import eventsDb from "../../model/eventsDb.js";
import userDb from "../../model/userDb.js";
import transactionDb from "../../model/transactionsDb.js";
import mongoose from "mongoose";

export const userDetails = async (page = 1, searchQuery = "", sort = "newest", onlyActive = "false") => {
  const limits = 5;
  const filter = {};

  if (searchQuery) {
    filter.$or = [
      { firstName: { $regex: searchQuery, $options: "i" } },
      { lastName: { $regex: searchQuery, $options: "i" } },
    ];
  }
  if (onlyActive === "true") filter.isBlocked = false;

  let sortOptions = { createdAt: -1 };
  if (sort === "oldest") sortOptions = { createdAt: 1 };
  else if (sort === "name-asc") sortOptions = { firstName: 1 };
  else if (sort === "name-desc") sortOptions = { firstName: -1 };

  const [blockedUsers, activeUsers, hosts, users, totalFilteredUser] = await Promise.all([
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

export const userProfile = async (userId) => {
  const user = await userDb.findById(userId);
  if (!user) throw new Error("User doesn't exist");
  return user;
};

export const blockAndUnblock = async (userId, action) => {
  let value;
  if (action === "block") value = true;
  else if (action === "unblock") value = false;
  else throw new Error("Invalid action");

  const user = await userDb.findByIdAndUpdate(userId, { isBlocked: value }, { new: true });
  if (!user) throw new Error("User not found / action failed");
  return user;
};

export const eventDetails = async () => {
  const liveEvents = await eventsDb.countDocuments({ status: "live" });
  const approvedEvents = await eventsDb.countDocuments({ status: "approved" });
  const finishedEvents = await eventsDb.countDocuments({ status: "finished" });
  const pendingEvents = await eventsDb.countDocuments({ status: "pending" });
  console.log(liveEvents, pendingEvents, approvedEvents, finishedEvents);
  return { liveEvents, pendingEvents, approvedEvents, finishedEvents };
};

export const getRevenueAnalytics = async (filters = {}) => {
  const { period = "daily", startDate, endDate, year, month } = filters;
  const adminWalletId = "698cbef296468910eaf52c9a";

  const matchStage = {
    walletId: new mongoose.Types.ObjectId(adminWalletId),
    status: "COMPLETED",
  };

  if (period === "daily" && startDate && endDate) {
    matchStage.createdAt = {
      $gte: new Date(startDate),
      $lte: new Date(endDate),
    };
  } else if (period === "monthly" && year && month) {
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59);
    matchStage.createdAt = { $gte: startOfMonth, $lte: endOfMonth };
  } else if (period === "yearly" && year) {
    matchStage.createdAt = {
      $gte: new Date(year, 0, 1),
      $lt: new Date(year, 11, 31, 23, 59, 59),
    };
  } else {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    matchStage.createdAt = { $gte: sevenDaysAgo };
  }

  const pipeline = [{ $match: matchStage }];

  if (period === "daily") {
    pipeline.push(
      {
        $addFields: {
          dateKey: {
            $concat: [
              { $substr: [{ $toString: "$createdAt" }, 0, 4] },
              "-",
              { $substr: [{ $toString: "$createdAt" }, 5, 2] },
              "-",
              { $substr: [{ $toString: "$createdAt" }, 8, 2] },
            ],
          },
        },
      },
      {
        $group: {
          _id: "$dateKey",
          sortValue: { $min: "$createdAt" },
          credits: {
            $sum: { $cond: [{ $eq: ["$type", "credit"] }, { $toDouble: "$amount" }, 0] },
          },
          debits: {
            $sum: { $cond: [{ $eq: ["$type", "debit"] }, { $toDouble: "$amount" }, 0] },
          },
        },
      },
    );
  } else if (period === "monthly") {
    pipeline.push({
      $group: {
        _id: { $dayOfMonth: "$createdAt" },
        sortValue: { $min: "$createdAt" },
        credits: {
          $sum: { $cond: [{ $eq: ["$type", "credit"] }, { $toDouble: "$amount" }, 0] },
        },
        debits: {
          $sum: { $cond: [{ $eq: ["$type", "debit"] }, { $toDouble: "$amount" }, 0] },
        },
      },
    });
  } else if (period === "yearly") {
    pipeline.push({
      $group: {
        _id: { $month: "$createdAt" },
        sortValue: { $min: "$createdAt" },
        credits: {
          $sum: { $cond: [{ $eq: ["$type", "credit"] }, { $toDouble: "$amount" }, 0] },
        },
        debits: {
          $sum: { $cond: [{ $eq: ["$type", "debit"] }, { $toDouble: "$amount" }, 0] },
        },
      },
    });
  }

  pipeline.push({ $sort: { sortValue: 1 } });

  const rawStats = await transactionDb.aggregate(pipeline);
  return formatLabels(rawStats, period);
};

const formatLabels = (rawStats, period) => {
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  return rawStats.map((stat) => {
    let label;

    switch (period) {
      case "daily":
        if (stat._id && typeof stat._id === "string" && stat._id.includes("-")) {
          const [y, m, d] = stat._id.split("-");
          const monthName = monthNames[parseInt(m, 10) - 1];
          label = `${monthName} ${parseInt(d, 10)}`;
        } else {
          label = stat._id || "Unknown";
        }
        break;
      case "monthly":
        label = String(stat._id || "");
        break;
      case "yearly":
        label = monthNames[(stat._id || 1) - 1] || "Unknown";
        break;
      default:
        label = stat._id || "Unknown";
    }

    return {
      _id: stat._id,
      label,
      sortValue: stat.sortValue,
      credits: Number(stat.credits) || 0,
      debits: Number(stat.debits) || 0,
    };
  });
};

export const formatChartResponse = (processedStats) => {
  if (!Array.isArray(processedStats)) return [];
  return processedStats.map((stat) => ({
    _id: stat._id,
    label: stat.label,
    inflow: Number(stat.credits) || 0,
    outflow: Number(stat.debits) || 0,
    net: (Number(stat.credits) || 0) - (Number(stat.debits) || 0),
  }));
};

export const calculateAdminBalance = (rawStats) => {
  if (!Array.isArray(rawStats)) return 0;
  return rawStats.reduce((acc, curr) => acc + ((Number(curr.credits) || 0) - (Number(curr.debits) || 0)), 0);
};
