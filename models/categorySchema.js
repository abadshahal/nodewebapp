const mongoose = require("mongoose");
const { Schema } = mongoose;

const categorySchema = new Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  description: {
    type: String,
    default: "",
    trim: true,
  },
  isListed: {
    type: Boolean,
    default: true,
  },
  offerValue: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
  offerType: {
    type: String,
    default: "percentage",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Category = mongoose.model("Category", categorySchema);

module.exports = Category;