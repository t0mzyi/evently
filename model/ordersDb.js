import mongoose from "mongoose";

const guestSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String },
  },
  { _id: false }
);

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

    totalAmount: {
      type: mongoose.Schema.Types.Decimal128,
      required: true,
    },

    status: {
      type: String,
      enum: ["PENDING", "CONFIRMED", "CANCELLED", "FAILED", "EXPIRED"],
      default: "PENDING",
    },

    guestDetails: guestSchema,

    paymentIntentId: {
      type: String,
    },
  },
  { timestamps: true }
);

export default mongoose.model("orders", orderSchema);
