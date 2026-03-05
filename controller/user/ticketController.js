import Razorpay from "razorpay";
import crypto from "crypto";
import orderDb from "../../model/ordersDb.js";
import ticketDb from "../../model/ticketDb.js";
import walletDb from "../../model/walletDb.js";
import {
  cancelTickets,
  finalizeOrder,
  groupedTickets,
  ticketBookingAndReserve,
  ticketBookingRender,
  ticketCancelAndRefunder,
  unReserveTicket,
} from "../../service/user/ticketsService.js";

export const bookTicket = async (req, res) => {
  const eventId = req.params.eventId;
  try {
    const event = await ticketBookingRender(eventId);
    res.render("user/tickets/book", { event });
  } catch (error) {
    console.log("Error in ticketBooking", error);
  }
};

export const showCancelTicket = async (req, res) => {
  try {
    const orderId = req.params.orderId;
    const userId = req.session.user;
    const tickets = await cancelTickets(orderId, userId);
    res.render("user/tickets/cancel", { tickets });
  } catch (error) {
    res.redirect(`/dashboard/myBookings?status=error&message=${error.message}`);
  }
};

export const viewTicket = (req, res) => {
  res.render("user/tickets/ticket");
};

export const showMybookings = async (req, res) => {
  try {
    const userId = req.session.user;
    const tickets = await groupedTickets(userId);
    res.render("user/dash/myBookings", { tickets });
  } catch (error) {
    console.log("Error in rendering my Bookings", error);
  }
};

export const ticketBooking = async (req, res) => {
  try {
    const { ticketId, eventId, quantity, price } = req.body;
    const userId = req.session.user;
    const ticketDetails = { ticketId, eventId, quantity, price, userId };
    const responce = await ticketBookingAndReserve(ticketDetails);
    return res.status(200).json({ success: true, orderId: responce.orderId });
  } catch (error) {
    console.log("error in ticketBooking", error);
    return res.status(404).json({ success: false, message: error.message });
  }
};

export const handleUnreservingTicket = async (req, res) => {
  try {
    const orderId = req.params.orderId;
    await unReserveTicket(orderId);
  } catch (error) {
    console.log("Error in handlingUnreserveTicket", error);
  }
};

export const checkoutPage = async (req, res) => {
  try {
    const orderId = req.params.orderId;
    const order = await orderDb.findById(orderId);
    if (!order || !req.session.user) {
      return res.redirect("/events?status=error&message=Unauthorized");
    }
    if (order.userId.toString() !== req.session.user.toString()) {
      return res.redirect("/events?status=error&message=Unauthorized");
    }
    const dateNow = new Date();
    if (dateNow > order.expiresAt || order.status === "FAILED") {
      return res.redirect("/events?status=error&message=Order Expired");
    }
    const wallet = await walletDb.findOne({ userId: order.userId });
    const walletBalance = wallet?.availableBalance?.toString() || "0";
    res.render("user/tickets/checkout", {
      order,
      walletBalance,
      razorpayKeyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.log("Error in checkoutPage ", error);
    res.redirect("/dashboard?status=false&message=" + error.message);
  }
};

export const processCheckout = async (req, res) => {
  try {
    console.log(req.body);
    const { orderId, attendee, discount, coupon, paymentMethod } = req.body;
    const normalizedAttendee = {
      firstName: attendee?.firstName || "",
      lastName: attendee?.lastName || "",
      phone: attendee?.phone || attendee?.phoneNumber || req.body.phone || "",
      email: attendee?.email || req.body.email || "",
    };
    const orderDetails = {
      orderId,
      attendee: normalizedAttendee,
      discount: discount || 0,
      coupon: coupon || "",
      paymentMethod,
    };
    await finalizeOrder(orderDetails);
    return res.status(200).json({ success: true });
  } catch (error) {
    console.log("Error in processCheckout", error.message);
    try {
      await unReserveTicket(req.body.orderId);
    } catch (unreserveError) {
      console.error("Failed to unreserve ticket:", unreserveError);
    }
    res.status(400).json({ success: false, message: error.message });
  }
};

export const createRazorpayOrder = async (req, res) => {
  try {
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
    const { orderId, totalAmount } = req.body;
    const order = await razorpay.orders.create({
      amount: Math.round(totalAmount * 100),
      currency: "INR",
      receipt: `order_${orderId}`,
    });
    return res.json({ success: true, razorpayOrderId: order.id });
  } catch (error) {
    console.error("Razorpay order creation error:", error);
    return res.status(500).json({ success: false, message: "Failed to create Razorpay order" });
  }
};

export const verifyRazorpayPayment = async (req, res) => {
  try {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature, orderId } = req.body;
    const RAZORPAY_SECRET = process.env.RAZORPAY_KEY_SECRET;
    const cryptoModule = await import("crypto");
    const cryptoLib = cryptoModule.default || crypto;
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = cryptoLib.createHmac("sha256", RAZORPAY_SECRET).update(body.toString()).digest("hex");
    if (expectedSignature === razorpay_signature) {
      const rawAttendee = req.body.attendee || {};
      const orderDetails = {
        orderId,
        paymentMethod: "razorpay",
        attendee: {
          firstName: rawAttendee.firstName || "",
          lastName: rawAttendee.lastName || "",
          phone: rawAttendee.phone || rawAttendee.phoneNumber || req.body.phone || "",
          email: rawAttendee.email || req.body.email || "",
        },
        discount: req.body.discount || 0,
        coupon: req.body.coupon || "",
      };
      console.log("Verified Attendee:", orderDetails.attendee);
      const { finalizeOrder } = await import("../../service/user/ticketsService.js");
      await finalizeOrder(orderDetails);
      return res.json({ success: true, message: "Payment successful via Razorpay" });
    } else {
      return res.status(400).json({ success: false, message: "Invalid Payment Signature" });
    }
  } catch (error) {
    console.error("Razorpay verification error:", error);
    try {
      const orderId = req.body.orderId;
      const { unReserveTicket } = await import("../../service/user/ticketsService.js");
      await unReserveTicket(orderId);
    } catch (unreserveError) {
      console.error("Failed to unreserve ticket after error:", unreserveError);
    }
    return res.status(500).json({
      success: false,
      message: error.message || "Payment verification failed.",
    });
  }
};

export const viewOrderTickets = async (req, res) => {
  try {
    const orderId = req.params.orderId;
    const tickets = await ticketDb.find({ orderId, status: "VALID" }).populate("eventId");
    res.render("user/tickets/ticket", { tickets });
  } catch (error) {
    res.redirect("/dashboard/myBookings");
  }
};

export const ticketCancelAndRefund = async (req, res) => {
  try {
    const orderId = req.body.orderId;
    const cancelTicketsIds = req.body.ticketIds;
    const userId = req.session.user;
    const refundedOrder = await ticketCancelAndRefunder({ orderId, cancelTicketsIds, userId });
    return res.status(200).json({ success: true });
  } catch (error) {
    console.log("Error in ticketCancelation", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
