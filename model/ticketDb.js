import mongoose from "mongoose";

const ticketSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "order",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "events",
      required: true,
    },
    ticketName: {
      type: String,
      required: true,
    },
    ticketTypeId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },

    seatTier: {
      type: String,
      required: true,
      trim: true,
    },
    seatNumber: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["VALID", "CANCELLED", "USED"],
      default: "VALID",
    },
    isUsed: {
      type: Boolean,
      default: false,
    },
    usedAt: {
      type: Date,
      default: null,
    },
    ticketId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    holderDetails: {
      firstName: { type: String, required: true, trim: true },
      lastName: { type: String, required: true, trim: true },
      email: { type: String, required: true, lowercase: true, trim: true },
      phone: { type: String, required: true, trim: true },
    },
    purchasePrice: {
      type: Number,
      required: true,
    },
  },
  { timestamps: true },
);

ticketSchema.index({ eventId: 1, seatTier: 1, seatNumber: 1, ticketId: 1 }, { unique: true });

const ticketDb = mongoose.model("ticket", ticketSchema);
export default ticketDb;
