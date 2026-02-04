import mongoose from "mongoose";
import orderDb from "../../model/ordersDb.js";
import { formatDate } from "../../utils/dateTimeFormator.js";

export const calenderRender = async (userId) => {
  const userOrdersWithEvents = await orderDb.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        status: "CONFIRMED",
      },
    },
    {
      $lookup: {
        from: "events",
        localField: "eventId",
        foreignField: "_id",
        as: "eventDetails",
      },
    },
    {
      $unwind: "$eventDetails",
    },
    {
      $project: {
        _id: 1,
        status: 1,
        title: "$eventDetails.title",
        eventDate: "$eventDetails.startDate",
      },
    },
    {
      $sort: { createdAt: -1 },
    },
  ]);
  userOrdersWithEvents.forEach((order) => {
    order.date = order.eventDate.toISOString().split("T")[0];
    order.startTime = order.eventDate.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  });

  return userOrdersWithEvents;
  console.log(userOrdersWithEvents);
};
