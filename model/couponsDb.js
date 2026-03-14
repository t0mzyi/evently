import mongoose from "mongoose";

const couponSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
  },
  type: { type: String, enum: ["HOST", "ADMIN"], required: true },
  discountType: { type: String, enum: ["PERCENTAGE", "FLAT"], required: true },
  discountValue: { type: Number, required: true },
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: "events", default: null }, // Null if Admin-wide
  hostId: { type: mongoose.Schema.Types.ObjectId, ref: "users" },
  minPurchase: { type: Number, default: 0 },
  maxDiscountAmount: { type: Number, default: 0 },
  expiryDate: { type: Date, required: true },
  usageLimit: { type: Number },
  usedCount: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
});

const couponDb = mongoose.model("coupons", couponSchema);
export default couponDb;
