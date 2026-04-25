const mongoose = require("mongoose");
const { Schema } = mongoose;

const userSchema = new Schema(
  {
    firstname:    { type: String, default: "User" },
    lastname:     { type: String, default: "" },
    email:        { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone:        { type: String, sparse: true, default: null },
    googleId:     { type: String, unique: true, sparse: true },
    password:     { type: String, default: null },
    profileImage: { type: String, default: "" },
    role:         { type: String, enum: ["user", "admin"], default: "user" },
    isGoogleUser: { type: Boolean, default: false },
    isVerified:   { type: Boolean, default: false },
    isBlocked:    { type: Boolean, default: false },
    wallet:       { type: Number, default: 0 }, 
    referralCode: { type: String },
    redeemed:     { type: Boolean, default: false },
    redeemedUsers: [{ type: Schema.Types.ObjectId, ref: "User" }],
    orderHistory:  [{ type: Schema.Types.ObjectId, ref: "Order" }],
    searchHistory: {
      type: [
        {
          category: { type: Schema.Types.ObjectId, ref: "Category" },
          brand:    String,
          searchOn: { type: Date, default: Date.now },
        },
      ],
      default: [],
      validate: v => v.length <= 20,
    },
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);
module.exports = User;