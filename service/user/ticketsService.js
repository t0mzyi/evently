import mongoose from "mongoose";
import eventsDb from "../../model/eventsDb.js";
import orderDb from "../../model/ordersDb.js";
import transactionDb from "../../model/transactionsDb.js";
import walletDb from "../../model/walletDb.js";
import { formatDate } from "../../utils/dateTimeFormator.js";
import ticketDb from "../../model/ticketDb.js";
import { generateBookingId } from "../../utils/ticketIdGenerator.js";

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
//
//
//
//
//
//

//unreserve
export const unReserveTicket = async (orderId) => {
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
};

//
//
//
//
//
//

export const finalizeOrder = async (orderDetails) => {
  const { orderId, attendee, email, discount, coupon, paymentMethod } = orderDetails;
  const order = await orderDb.findById(orderId);
  const dateNow = new Date();

  if (dateNow > order.expiresAt) {
    throw new Error("Order expired");
  }
  //discount logic here
  const totalAmountToPay = order.pricing.totalAmount;

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
    } catch (error) {
      console.error("CRITICAL: Ticket Generation Failed. Initiating Refund.", error);
      await refundWallet(order.userId, totalAmountToPay, "Refund: System Error during Ticket Generation");
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

  const nextSeatNumber = lastTicket ? lastTicket.seatNumber + 1 : 1;
  const holderDetails = {
    firstName: order.attendees.firstName,
    lastName: order.attendees.lastName,
    phone: order.attendees.phone,
    emailAddress: order.attendees.emailAddress,
  };
  const newTickets = [];
  for (let i = 0; i < order.selectedTicket.quantity; i++) {
    const uniqueId = generateBookingId();
    newTickets.push({
      orderId: order._id,
      userId: order.userId,
      eventId: order.eventId,
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
