const mongoose = require("mongoose");
const { Schema } = mongoose;

const userSchema = new Schema({

  firstname: {
    type: String,
    required: false,
    default: "User"
  },

  lastname: {
    type: String,
    required: false,
    default: ""
  },

  email: {
    type: String,
    required: true,
    unique: true, // 🔥 IMPORTANT
    lowercase: true,
    trim: true
  },

  phone: {
    type: String,
    sparse: true,
    default: null
  },

  googleId: {
    type: String,
    unique: true,
    sparse: true
  },

  password: {
    type: String,
    default: null
  },

  otp:{
    type:String,
    default:null

  },
  otpExpiry:{
    type:Date,
    default:null

  },

  profileImage: {
    type: String,
    default: ""
  },

  isGoogleUser: {
    type: Boolean,
    default: false
  },

  isVerified: {
    type: Boolean,
    default: false
  },

  isBlocked: {
    type: Boolean,
    default: false
  },

  isAdmin: {
    type: Boolean,
    default: false
  },

  cart: [{
    type: Schema.Types.ObjectId,
    ref: "Cart"
  }],

  wallet: {
    type: Number,
    default: 0
  },

  wishlist: [{
    type: Schema.Types.ObjectId,
    ref: "Wishlist"
  }],

  orderHistory: [{
    type: Schema.Types.ObjectId,
    ref: "Order"
  }],

  createdOn: {
    type: Date,
    default: Date.now
  },

  referalCode: {
    type: String
  },

  redeemed: {
    type: Boolean,
    default: false
  },

  redeemedUsers: [{
    type: Schema.Types.ObjectId,
    ref: "User"
  }],

  searchHistory: [{
    category: {
      type: Schema.Types.ObjectId,
      ref: "Category"
    },
    brand: String,
    searchOn: {
      type: Date,
      default: Date.now
    }
  }]

}, { timestamps: true });

const User = mongoose.model("User", userSchema);
module.exports = User;