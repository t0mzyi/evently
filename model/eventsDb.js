import mongoose from "mongoose";

const ticketTypeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      default: 0,
    },
    quantityTotal: {
      type: Number,
      required: true,
    },
    quantityAvailable: {
      type: Number,
      required: true,
    },
    isFree: {
      type: Boolean,
      default: false,
    },
    description: {
      type: String,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { _id: true },
);

const eventsSchema = new mongoose.Schema(
  {
    hostId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      required: true,
    },

    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "categories",
      required: true,
    },

    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },

    venueType: {
      type: String,
      enum: ["iconic", "custom"],
      required: true,
    },

    // If iconic venue
    venueId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "venues",
    },

    // If custom venue
    venueDetails: {
      name: String,
      address: String,
      city: String,
      state: String,
      mapLink: String,
    },

    galleryImages: {
      type: [String],
      default: [],
    },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "live", "completed"],
      default: "pending",
    },

    rejectionReason: {
      type: String,
    },

    isFeatured: {
      type: Boolean,
      default: false,
    },

    featuredUntil: {
      type: Date,
    },

    ticketTypes: {
      type: [ticketTypeSchema],
      required: true,
    },

    isBlocked: {
      type: Boolean,
      default: false,
    },

    totalCapacity: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

export default mongoose.model("events", eventsSchema);
