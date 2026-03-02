import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "events",
      default: null,
    },
    venueId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "venues",
      default: null,
    },
    rating: {
      type: Number,
      required: true,
      min: [1, "Rating must be at least 1"],
      max: [5, "Rating cannot exceed 5"],
    },
    comment: {
      type: String,
      required: true,
      trim: true,
      maxlength: [500, "Review cannot exceed 500 characters"],
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

const reviewDb = mongoose.model("review", reviewSchema);
export default reviewDb;
