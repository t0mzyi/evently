import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "events",
      required: true,
    },
    selectedTicket: {
      ticketTypeId: mongoose.Schema.Types.ObjectId,
      name: String,
      price: Number,
      quantity: Number,
    },

    attendees: {
      firstName: String,
      lastName: String,
      email: String,
      phone: String,
      ticketTypeId: mongoose.Schema.Types.ObjectId,
    },

    pricing: {
      subTotal: Number,
      couponCode: String,
      discountAmount: { type: Number, default: 0 },
      serviceFee: Number,
      totalAmount: { type: Number, required: true },
    },
    status: {
      type: String,
      enum: ["PENDING", "CONFIRMED", "CANCELLED", "REFUNDED", "FAILED", "EXPIRED"],
      default: "PENDING",
    },
    paymentIntentId: String,
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 5 * 60 * 1000),
    },
    cancelledTicketsCount: {
      type: Number,
      default: 0,
    },
    refundedAmount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true },
);

const orderDb = mongoose.model("order", orderSchema);
export default orderDb;
