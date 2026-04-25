const mongoose = require("mongoose");
const { Schema } = mongoose; 

const otpSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  otp:    { type: String, required: true }, // hashed
  expiry: { type: Date,   required: true },
}, { timestamps: true });

otpSchema.index({ expiry: 1 }, { expireAfterSeconds: 0 }); // auto-delete expired docs

const otp = mongoose.model("Otp", otpSchema);
module.exports = otp;