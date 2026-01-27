import mongoose from "mongoose";

const walletSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
      unique: true,
      index: true,
    },

    availableBalance: {
      type: mongoose.Schema.Types.Decimal128,
      default: 0,
    },

    pendingBalance: {
      type: mongoose.Schema.Types.Decimal128,
      default: 0,
    },

    totalEarnings: {
      type: mongoose.Schema.Types.Decimal128,
      default: 0,
    },
  },
  {
    timestamps: { createdAt: false, updatedAt: true },
  },
);

const walletDb = mongoose.model("wallet", walletSchema);
export default walletDb;
