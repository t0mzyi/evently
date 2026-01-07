import mongoose from "mongoose";

const venueSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      required: true,
    },
    capacity: {
      type: Number,
      required: true,
    },
    address: {
      type: String,
      required: true,
    },
    map_url: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    image_url: {
      type: Array,
      required: true,
    },
    amenities: {
      type: Array,
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

const venueDb = mongoose.model("venues", venueSchema);
export default venueDb;
