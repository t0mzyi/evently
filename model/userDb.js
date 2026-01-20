import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
    },
    lastName: {
      type: String,
      required: true,
    },
    emailAddress: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    password: {
      type: String,
      minlength: 6,
    },
    avatarUrl: {
      type: String,
      default: "https://cdn-icons-png.flaticon.com/512/149/149071.png",
    },
    bio: {
      type: String,
      default: null,
    },
    isBlocked: {
      type: Boolean,
      default: false,
    },
    lastLoginAt: {
      type: Date,
      default: Date.now(),
    },
    googleId: {
      type: String,
      default: null,
    },
    isHost: {
      type: Boolean,
      default: false,
    },

    hostedEvents: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "events",
      },
    ],
    attentedCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

userSchema.index({ firstName: 1 });

const userDb = mongoose.model("user", userSchema);

export default userDb;
