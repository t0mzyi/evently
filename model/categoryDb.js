import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    //     _id objectId
    //   name string
    //   description string
    //   iconUrl string
    //   colorHex string
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    iconUrl: {
      type: String,
      required: true,
      default: "🎭",
    },
    colorHex: {
      type: String,
    },
    events: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "events",
        default: [],
      },
    ],
  },
  { timestamps: true },
);

const categoryDb = mongoose.model("categories", categorySchema);
export default categoryDb;
