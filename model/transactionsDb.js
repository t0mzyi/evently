import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema(
  {
    paymentMethod: {
      type: String,
      enum: ["Razorpay", "Wallet"],
    },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "user" },
    walletId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "wallet",
    },
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "event",
    },
    type: {
      type: String,
      enum: ["credit", "debit"],
      required: true,
    },
    amount: {
      type: mongoose.Schema.Types.Decimal128,
      required: true,
    },
    description: String,
    status: {
      type: String,
      default: "PENDING",
      enum: ["PENDING", "COMPLETED", "FAILED"],
    },
    failedReason: {
      type: String,
    },
    couponId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "coupon",
    },
    razorpayOrderId: {
      type: String,
    },
    razorpayPaymentId: {
      type: String,
    },
    razorpaySignature: {
      type: String,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

const transactionDb = mongoose.model("transaction", transactionSchema);
export default transactionDb;
