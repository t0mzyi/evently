import mongoose from "mongoose";
import eventsDb from "../../model/eventsDb.js";
import orderDb from "../../model/ordersDb.js";
import transactionDb from "../../model/transactionsDb.js";
import walletDb from "../../model/walletDb.js";
import { formatDate } from "../../utils/dateTimeFormator.js";
import ticketDb from "../../model/ticketDb.js";
import { generateBookingId } from "../../utils/ticketIdGenerator.js";
import { addMoneyWallet, debitWallet, refundWallet } from "./walletService.js";
import { creditAdminWallet, debitAdminWallet } from "../admin/walletService.js";
import couponDb from "../../model/couponsDb.js";

export const ticketBookingRender = async (eventId) => {
  const event = await eventsDb.findById(eventId);
  if (!event) throw new Error("No event such exists");
  if (event.status != "live") throw new Error("Event blocked");
  event.sDate = formatDate(event.startDate);
  event.eDate = formatDate(event.endDate);
  return event;
};

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
  const unitPrize = ticket.price;
  const subTotal = unitPrize * quantity;
  const totalAmount = Math.round(subTotal * 1.025 * 100) / 100;
  const serviceFee = totalAmount - subTotal;
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

export const unReserveTicket = async (orderId) => {
  const order = await orderDb.findById(orderId);
  if (!order) return;
  if (order.status !== "FAILED") {
    const orderDetails = await orderDb.findByIdAndUpdate(
      orderId,
      { status: "FAILED", $unset: { expiresAt: "" } },
      { new: true },
    );
    const ticketId = orderDetails.selectedTicket.ticketTypeId;
    const quantity = orderDetails.selectedTicket.quantity;
    await eventsDb.findOneAndUpdate(
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
  }
};

export const finalizeOrder = async (orderDetails) => {
  const { orderId, attendee, discount, coupon, paymentMethod } = orderDetails;
  const order = await orderDb.findById(orderId);
  const dateNow = new Date();
  if (dateNow > order.expiresAt || order.status == "FAILED") {
    throw new Error("Order expired");
  }
  let discountAmount = 0;
  let appliedCouponCode = null;
  let validatedCoupon = null;

  if (coupon && coupon.trim() !== "") {
    validatedCoupon = await couponDb.findOne({
      code: coupon.toUpperCase().trim(),
      isActive: true,
      expiryDate: { $gt: new Date() },
      $or: [{ eventId: null }, { eventId: order.eventId }],
      minPurchase: { $lte: order.pricing.subTotal },
      $expr: {
        $or: [{ $eq: ["$usageLimit", null] }, { $lt: ["$usedCount", "$usageLimit"] }],
      },
    });
    if (validatedCoupon) {
      if (validatedCoupon.discountType === "PERCENTAGE") {
        discountAmount = (order.pricing.subTotal * validatedCoupon.discountValue) / 100;

        if (validatedCoupon.maxDiscountAmount && validatedCoupon.maxDiscountAmount > 0) {
          discountAmount = Math.min(discountAmount, validatedCoupon.maxDiscountAmount);
        }
      } else {
        discountAmount = Math.min(validatedCoupon.discountValue, order.pricing.subTotal);
      }
      discountAmount = Math.round(discountAmount * 100) / 100;
      appliedCouponCode = validatedCoupon.code;
    }
  }

  const discountedSubtotal = Math.max(0, order.pricing.subTotal - discountAmount);
  const serviceFee = Math.round(discountedSubtotal * 0.025 * 100) / 100;
  const calculatedTotal = Math.round((discountedSubtotal + serviceFee) * 100) / 100;

  order.pricing.discountAmount = discountAmount;
  order.pricing.couponCode = appliedCouponCode;
  order.pricing.serviceFee = serviceFee;
  order.pricing.totalAmount = calculatedTotal;

  const totalAmountToPay = calculatedTotal;
  let walletId = null;
  if (paymentMethod === "wallet") {
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
      walletId: walletId,
      eventId: order.eventId,
      orderId: order._id,
      type: "debit",
      amount: totalAmountToPay,
      description: `Payment for ${order.selectedTicket.name}`,
      status: "COMPLETED",
    });
    order.status = "CONFIRMED";
    order.attendees = {
      firstName: attendee?.firstName || "",
      lastName: attendee?.lastName || "",
      phone: attendee?.phone || attendee?.phoneNumber || "",
      email: attendee?.email || "",
    };
    order.expiresAt = undefined;
    await order.save();
  } else if (paymentMethod === "razorpay") {
    order.status = "CONFIRMED";
    order.attendees = {
      firstName: attendee?.firstName || "",
      lastName: attendee?.lastName || "",
      phone: attendee?.phone || attendee?.phoneNumber || "",
      email: attendee?.email || "",
    };
    order.expiresAt = undefined;
    await order.save();
    await transactionDb.create({
      eventId: order.eventId,
      orderId: order._id,
      type: "credit",
      amount: totalAmountToPay,
      description: `Payment for ${order.selectedTicket.name}`,
      status: "COMPLETED",
      paymentMethod: "Razorpay",
    });
  }
  if (validatedCoupon) {
    await couponDb.findByIdAndUpdate(validatedCoupon._id, { $inc: { usedCount: 1 } });
  }
  try {
    await generateTickets(order);
    const event = await eventsDb.findById(order.eventId);

    if (event && event.hostId) {
      let hostEarnings = order.pricing.subTotal;
      if (validatedCoupon) {
        if (validatedCoupon.type == "HOST") {
          hostEarnings = order.pricing.subTotal - discountAmount;
        } else if (validatedCoupon.type == "ADMIN") {
          hostEarnings = order.pricing.subTotal;
          await debitAdminWallet(
            discountAmount,
            `Platform Coupon Discount: ${appliedCouponCode} for Order #${order._id}`,
          );
        }
      }
      if (hostEarnings > 0) {
        await addMoneyWallet(
          event.hostId,
          hostEarnings,
          `Revenue from Ticket Sales (Order #${order._id})${appliedCouponCode ? ` [${appliedCouponCode}]` : ""}`,
          order,
        );
      }
      if (order.pricing.serviceFee > 0) {
        await creditAdminWallet(
          order.pricing.serviceFee,
          `Service Fee for Order #${order._id}${appliedCouponCode ? ` [${appliedCouponCode}]` : ""}`,
        );
      }
    }
  } catch (error) {
    console.error("Error on generateTIckets.", error);
    if (walletId) {
      try {
        await refundWallet(walletId, order.userId, totalAmountToPay, order._id, order.eventId);
        console.log(`Wallet refunded ₹${totalAmountToPay} for Order #${order._id}`);
      } catch (refundError) {
        console.error("Refund failed:", refundError);
      }
    }
    order.status = "REFUNDED";
    await order.save();
    throw new Error("Booking failed during ticket generation.");
  }
};

export const generateTickets = async (order) => {
  const event = await eventsDb.findById(order.eventId);
  if (!order.attendees || (!order.attendees.email && !order.attendees.phone)) {
    throw new Error("Attendee email or phone number is missing");
  }
  const tierIndex = event.ticketTypes.findIndex(
    (t) => t._id.toString() === order.selectedTicket.ticketTypeId.toString(),
  );
  const seatTier = String.fromCharCode(65 + tierIndex);
  const lastTicket = await ticketDb.findOne({ eventId: event._id, seatTier: seatTier }).sort({ seatNumber: -1 });
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
  console.log(`Generated ${newTickets.length} tickets.`);
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
  return tickets;
};

export const ticketCancelAndRefunder = async (body) => {
  const order = await orderDb.findById(body.orderId).populate("eventId", "title hostId");

  if (!order) {
    throw new Error("Order not found");
  }

  const hasAccess = order.userId.toString() === body.userId.toString();
  if (!hasAccess) {
    throw new Error("Unauthorized");
  }

  if (order.status === "REFUNDED" || order.status === "FAILED") {
    throw new Error("Order already refunded or failed");
  }

  const ticketsCount = body.cancelTicketsIds.length;
  const totalTickets = order.selectedTicket.quantity;

  let usedCoupon = null;
  if (order.pricing.couponCode) {
    usedCoupon = await couponDb.findOne({ code: order.pricing.couponCode });
  }

  if (usedCoupon && ticketsCount < totalTickets) {
    throw new Error("Tickets purchased using coupons cannot be canceled partially. Either cancel all tickets.");
  }

  const discountAmount = order.pricing.discountAmount || 0;
  const discountedSubtotal = order.pricing.subTotal - discountAmount;

  const pricePerTicketUser = discountedSubtotal / totalTickets;
  const totalRefundAmount = Math.round(pricePerTicketUser * ticketsCount * 100) / 100;

  let hostEarningsPerTicket = order.pricing.subTotal / totalTickets;
  if (usedCoupon && usedCoupon.type === "HOST") {
    hostEarningsPerTicket = discountedSubtotal / totalTickets;
  }
  const hostReversalAmount = Math.round(hostEarningsPerTicket * ticketsCount * 100) / 100;

  const adminDiscountedRefund =
    usedCoupon && usedCoupon.type === "ADMIN"
      ? Math.round((discountAmount / totalTickets) * ticketsCount * 100) / 100
      : 0;

  const cancelledTicketIds = [];
  for (const ticketId of body.cancelTicketsIds) {
    const ticket = await ticketDb.findOne({
      _id: ticketId,
      orderId: body.orderId,
      status: "VALID",
    });

    if (ticket) {
      ticket.status = "CANCELLED";
      await ticket.save();
      cancelledTicketIds.push(ticketId);

      await eventsDb.findOneAndUpdate(
        { _id: order.eventId, "ticketTypes._id": order.selectedTicket.ticketTypeId },
        { $inc: { "ticketTypes.$.quantityAvailable": 1 } },
      );
      console.log(`Ticket ${ticketId} cancelled. Inventory restored.`);
    } else {
      console.log(`Warning: Ticket ${ticketId} not found or already cancelled`);
    }
  }

  if (cancelledTicketIds.length === 0) {
    throw new Error("No valid tickets found to cancel");
  }

  const updatedOrder = await orderDb.findByIdAndUpdate(
    body.orderId,
    {
      $inc: {
        cancelledTicketsCount: cancelledTicketIds.length,
        refundedAmount: totalRefundAmount,
      },
    },
    { new: true },
  );

  if (updatedOrder.cancelledTicketsCount >= totalTickets) {
    updatedOrder.status = "REFUNDED";
    await updatedOrder.save();
  }

  if (usedCoupon && cancelledTicketIds.length === totalTickets) {
    await couponDb.findByIdAndUpdate(usedCoupon._id, {
      $inc: { usedCount: -1 },
    });
    console.log(`Coupon ${usedCoupon.code} usedCount decremented by 1`);
  }
  await addMoneyWallet(
    order.userId,
    totalRefundAmount,
    `Refund for ${cancelledTicketIds.length} cancelled ticket(s) from Order #${order._id}`,
    order,
  );

  if (hostReversalAmount > 0 && order.eventId?.hostId) {
    await debitWallet(
      order.eventId.hostId,
      hostReversalAmount,
      `Reversal for ${cancelledTicketIds.length} cancelled tickets - Order #${order._id}`,
      order,
    );
    console.log(`Host debited ₹${hostReversalAmount}`);
  }

  if (adminDiscountedRefund > 0) {
    await creditAdminWallet(
      adminDiscountedRefund,
      `Coupon discount reversal (${usedCoupon.code}) for ${cancelledTicketIds.length} cancelled tickets - Order #${order._id}`,
    );
    console.log(`Admin credited ₹${adminDiscountedRefund} (discount portion)`);
  }

  console.log(`Cancellation successful for Order #${order._id}`);

  return {
    success: true,
    refundAmount: totalRefundAmount,
    cancelledTickets: cancelledTicketIds.length,
    isFullyRefunded: updatedOrder.status === "REFUNDED",
  };
};
