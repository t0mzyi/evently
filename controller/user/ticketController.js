import orderDb from "../../model/ordersDb.js";
import walletDb from "../../model/walletDb.js";
import {
  finalizeOrder,
  ticketBookingAndReserve,
  ticketBookingRender,
  unReserveTicket,
} from "../../service/user/ticketsService.js";

export const bookTicket = async (req, res) => {
  const eventId = req.params.eventId;
  try {
    const event = await ticketBookingRender(eventId);
    // console.log(event);
    res.render("user/tickets/book", { event });
  } catch (error) {
    console.log("Error in ticketBooking", error);
  }
};
export const cancelTicket = (req, res) => {
  res.render("user/tickets/cancel");
};
export const viewTicket = (req, res) => {
  res.render("user/tickets/ticket");
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
    const unreserve = await unReserveTicket(orderId);
  } catch (error) {
    console.log("Error in handlingUnreserveTicket");
  }
};

export const checkoutPage = async (req, res) => {
  try {
    const orderId = req.params.orderId;
    const order = await orderDb.findById(orderId);
    const wallet = await walletDb.findOne({ userId: order.userId });
    // console.log(wallet);
    const walletBalance = wallet.availableBalance.toString();
    if (!order) {
      return res.redirect("/events?status=error&message=UnAuthorised");
    }
    console.log(walletBalance);
    res.render("user/tickets/checkout", { order, walletBalance });
  } catch (error) {
    console.log("Error in checkoutPage ", error);
  }
};

export const processCheckout = async (req, res) => {
  try {
    console.log(req.body);
    const { orderId, attendee, email, discount, coupon, paymentMethod } = req.body;
    const orderDetails = { orderId, attendee, email, discount, coupon, paymentMethod };
    await finalizeOrder(orderDetails);
    return res.status(200).json({ success: true });
  } catch (error) {
    console.log("Error in processCheckout", error.message);
    await unReserveTicket(req.body.orderId);
    await res.status(400).json({ success: false, message: error.message });
  }
};
