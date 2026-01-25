import mongoose from "mongoose";

const bookmarksSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
    },
  },
  { timestamps: true },
);
bookmarksSchema.index({ userId: 1, eventId: 1 }, { unique: true });
export const bookmarksDb = mongoose.model("bookmarks", bookmarksSchema);
