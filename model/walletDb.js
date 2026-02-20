import mongoose from "mongoose";
const walletSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["USER", "PLATFORM"],
      default: "USER",
      index: true,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: function () {
        return this.type === "USER";
      },
      unique: true,
      sparse: true,
    },

    availableBalance: {
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
