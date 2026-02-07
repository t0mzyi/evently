import mongoose from "mongoose";
import eventsDb from "../../model/eventsDb.js";
import orderDb from "../../model/ordersDb.js";
import transactionDb from "../../model/transactionsDb.js";
import walletDb from "../../model/walletDb.js";
import { formatDate } from "../../utils/dateTimeFormator.js";
import ticketDb from "../../model/ticketDb.js";
import { generateBookingId } from "../../utils/ticketIdGenerator.js";
import { addMoneyWallet, debitWallet, refundWallet } from "./walletService.js";

export const ticketBookingRender = async (eventId) => {
  const event = await eventsDb.findById(eventId);
  if (!event) throw new Error("No event such exists");
  event.sDate = formatDate(event.startDate);
  event.eDate = formatDate(event.endDate);
  return event;
};

//reserve
export const ticketBookingAndReserve = async (ticketDetails) => {
  const { ticketId, eventId, quantity, userId } = ticketDetails;
  const event = await eventsDb.findById(eventId);
  const ticket = event.ticketTypes.find((t) => t._id.toString() === ticketId.toString());
  const targetEventId = new mongoose.Types.ObjectId(eventId);
  const targetTicketId = new mongoose.Types.ObjectId(ticketId);

  const reserveTickets = await eventsDb.updateOne(
    {
      _id: targetEventId,
      ticketTypes: {
        $elemMatch: {
          _id: targetTicketId,
          quantityAvailable: { $gte: quantity },
        },
      },
    },
    {
      $inc: { "ticketTypes.$.quantityAvailable": -quantity },
    },
  );

  if (reserveTickets.modifiedCount === 0) {
    throw new Error("Sold out or insufficient stock for this specific category");
  }

  // Logic: (Price * Qty) + 2.5% Fee

  const unitPrize = ticket.price;
  const subTotal = unitPrize * quantity;
  const totalAmount = Math.round(subTotal * 1.025 * 100) / 100;
  const serviceFee = totalAmount - subTotal;

  // console.log("unitPrize", unitPrize);
  // console.log("subtotal", subTotal);
  // console.log("serviceFee", serviceFee);

  //ticketDetails
  const selectedTicket = {
    ticketTypeId: ticket._id,
    name: ticket.name,
    price: ticket.price,
    quantity: quantity,
  };
  const pricing = {
    subTotal,
    serviceFee,
    totalAmount,
  };
  const expiryDate = new Date(Date.now() + 5 * 60 * 1000);
  const order = await orderDb.create({
    userId,
    eventId,
    selectedTicket,
    pricing,
    status: "PENDING",
    expiresAt: expiryDate,
  });

  console.log(`Ticket ${ticket.name} in ${event.title} event Reserved`);

  return { orderId: order._id };
};

//

//unreserve
export const unReserveTicket = async (orderId) => {
  const order = await orderDb.findById(orderId);

  if (order.status != "FAILED") {
    const orderDetails = await orderDb.findByIdAndUpdate(
      orderId,
      { status: "FAILED", $unset: { expiresAt: "" } },
      { new: true },
    );
    const ticketId = orderDetails.selectedTicket.ticketTypeId;
    const quantity = orderDetails.selectedTicket.quantity;
    const ticketUpdate = await eventsDb.findOneAndUpdate(
      {
        _id: orderDetails.eventId,
        "ticketTypes._id": ticketId,
      },
      {
        $inc: { "ticketTypes.$.quantityAvailable": quantity },
      },
      { new: true },
    );

    console.log(`Inventory Restored: +${quantity} tickets for ${orderDetails.selectedTicket.name}`);
  } else {
    console.log(`Unreserve Called But nothing to restore`);
  }
};

//
//

export const finalizeOrder = async (orderDetails) => {
  const { orderId, attendee, discount, coupon, paymentMethod } = orderDetails;
  const order = await orderDb.findById(orderId);
  const dateNow = new Date();

  if (dateNow > order.expiresAt || order.status == "FAILED") {
    throw new Error("Order expired");
  }
  //discount logic here
  const totalAmountToPay = order.pricing.totalAmount;
  let walletId = null;
  if (paymentMethod == "wallet") {
    const walletUpdate = await walletDb.findOneAndUpdate(
      {
        userId: order.userId,
        availableBalance: { $gte: totalAmountToPay },
      },
      { $inc: { availableBalance: -totalAmountToPay } },
      { new: true },
    );
    if (!walletUpdate) {
      order.status = "FAILED";
      await order.save();
      throw new Error("Insufficient wallet balance");
    }
    walletId = walletUpdate._id;
    await transactionDb.create({
      walletId: walletUpdate._id,
      eventId: order.eventId,
      orderId: order._id,
      type: "debit",
      amount: totalAmountToPay,
      description: `Payment for ${order.selectedTicket.name}`,
      status: "COMPLETED",
    });

    order.status = "CONFIRMED";
    order.attendees = attendee;
    order.expiresAt = undefined;
    await order.save();

    try {
      await generateTickets(order);
      const event = await eventsDb.findById(order.eventId);
      if (event && event.adminId) {
        const hostEarnings = order.pricing.subTotal;
        await addMoneyWallet(event.adminId, hostEarnings, `Revenue from Ticket Sales (Order #${order._id})`, order);
      }
    } catch (error) {
      console.error("Error on generateTIckets.", error);
      if (walletId) {
        await refundWallet(walletId, order.userId, totalAmountToPay, order._id, order.eventId);
      }
      order.status = "REFUNDED";
      await order.save();
      throw new Error("Booking failed during ticket generation. Your wallet has been refunded.");
    }
  }
};

export const generateTickets = async (order) => {
  const event = await eventsDb.findById(order.eventId);
  const tierIndex = event.ticketTypes.findIndex(
    (t) => t._id.toString() === order.selectedTicket.ticketTypeId.toString(),
  );
  const seatTier = String.fromCharCode(65 + tierIndex);
  const lastTicket = await ticketDb
    .findOne({ eventId: event._id, ticketTypeId: order.ticketTypeId })
    .sort({ seatNumber: -1 });

  let nextSeatNumber = lastTicket ? lastTicket.seatNumber + 1 : 1;

  const holderDetails = {
    firstName: order.attendees.firstName,
    lastName: order.attendees.lastName,
    phone: order.attendees.phone,
    email: order.attendees.email,
  };
  let newTickets = [];
  for (let i = 0; i < order.selectedTicket.quantity; i++) {
    const uniqueId = generateBookingId();
    newTickets.push({
      orderId: order._id,
      userId: order.userId,
      eventId: order.eventId,
      ticketName: order.selectedTicket.name,
      ticketTypeId: order.selectedTicket.ticketTypeId,
      seatTier: seatTier,
      seatNumber: nextSeatNumber++,
      holderDetails: holderDetails,
      isUsed: false,
      ticketId: uniqueId,
      purchasePrice: order.pricing.totalAmount / order.selectedTicket.quantity,
    });
  }
  await ticketDb.insertMany(newTickets);
  console.log(`Generated ${newTickets.length} tickets. IDs: ${newTickets.map((t) => t.ticketId).join(", ")}`);
};

export const groupedTickets = async (userId) => {
  const allTickets = await ticketDb
    .find({ userId: userId, status: "VALID" })
    .populate("eventId")
    .sort({ createdAt: -1 })
    .lean();
  if (!allTickets || allTickets.length == 0) return [];
  const grouped = allTickets.reduce((acc, tk) => {
    const orderId = tk.orderId;
    if (!acc[orderId]) {
      acc[orderId] = {
        orderId: tk.orderId,
        event: tk.eventId,
        seatTier: tk.seatTier,
        seats: [],
        totalPaid: 0,
        ticketCount: 0,
        status: tk.isUsed ? "Used" : new Date(tk.eventId.startDate) < new Date() ? "Past" : "Upcoming",
      };
    }
    acc[orderId].seats.push(tk.seatNumber);
    acc[orderId].totalPaid += tk.purchasePrice;
    acc[orderId].ticketCount += 1;
    return acc;
  }, {});
  const objToArray = Object.values(grouped);
  objToArray.forEach((b) => (b.event.startDate = formatDate(b.event.startDate)));
  console.log("grp", objToArray);
  return objToArray;
};

export const cancelTickets = async (orderId, userId) => {
  const tickets = await ticketDb.find({ orderId: orderId, status: "VALID" }).populate("eventId", "title");
  if (!tickets) throw Error("No tickets available");
  if (tickets[0].userId.toString() !== userId) throw new Error("Unauthorised");

  tickets.forEach((t) => {
    const totalPaid = parseFloat(t.purchasePrice.toString());
    t.basePrice = Math.round((totalPaid / 1.025) * 100) / 100;
  });
  // console.log(tickets);
  return tickets;
};

export const ticketCancelAndRefunder = async (body) => {
  console.log("body", body);
  const order = await orderDb.findById(body.orderId).populate("eventId", "title hostId");
  const hasAccess = order.userId.toString() === body.userId.toString();
  if (!hasAccess) throw new Error("Unauthorised");

  const ticketsCount = body.cancelTicketsIds.length;
  const pricePerTicket = (order.pricing.subTotal - order.pricing.discountAmount) / order.selectedTicket.quantity;
  const totalRefundAmount = pricePerTicket * ticketsCount;
  for (const ticketId of body.cancelTicketsIds) {
    const ticket = await ticketDb.findOne({
      _id: ticketId,
      orderId: body.orderId,
      status: "VALID",
    });

    if (ticket) {
      ticket.status = "CANCELLED";
      await ticket.save();
      console.log(`Ticket ${ticketId} status updated to CANCELLED`);
      await eventsDb.findOneAndUpdate(
        { _id: order.eventId._id, "ticketTypes._id": order.selectedTicket.ticketTypeId },
        { $inc: { "ticketTypes.$.quantityAvailable": 1 } },
      );
    } else {
      console.log(`Warning: Ticket ${ticketId} not found or already cancelled.`);
    }
  }
  const updatedOrder = await orderDb.findByIdAndUpdate(
    body.orderId,
    {
      $inc: {
        cancelledTicketsCount: ticketsCount,
        refundedAmount: totalRefundAmount,
      },
    },
    { new: true },
  );
  if (updatedOrder.cancelledTicketsCount >= order.selectedTicket.quantity) {
    updatedOrder.status = "REFUNDED";
    await updatedOrder.save();
  }
  await addMoneyWallet(
    order.userId,
    totalRefundAmount,
    `Refund for ${ticketsCount} cancelled ticket(s) from Order #${order._id}`,
    order,
  );

  console.log(`Money refunded for cancellation ${totalRefundAmount}`);

  await debitWallet(
    order.eventId.hostId,
    totalRefundAmount,
    `Reversal for cancelled tickets - Order #${order._id}`,
    order,
  );
  return {
    success: true,
    refundAmount: totalRefundAmount,
    isFullyRefunded: updatedOrder.status === "REFUNDED",
  };
};
