const mongoose = require("mongoose");
const { Schema } = mongoose;
const { v4: uuidv4 } = require("uuid");

const orderSchema = new Schema({
    orderId: {
        type: String,
        default: () => uuidv4(),
        unique: true
    },
    user: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    orderedItems: [{
        product: {
            type: Schema.Types.ObjectId,
            ref: "Product",
            required: true
        },
        variant: {
            type: Schema.Types.ObjectId,
            required: true
        },
        quantity: { type: Number, required: true },
        price:    { type: Number, default: 0 },
         isCancelled: { type: Boolean, default: false },  
    cancelReason: { type: String, default: null },
    }],
    totalPrice:   { type: Number, required: true },
    discount:     { type: Number, default: 0 },
    finalAmount:  { type: Number, required: true },
    address: {
        type: Schema.Types.ObjectId,
        ref: "Address",
        required: true
    },
    paymentMethod: {
        type: String,
        required: true,
        enum: ["cod", "razorpay", "wallet"]
    },
    invoiceDate:  { type: Date },
    createdOn:     { type: Date, default: Date.now, required: true },
    status: {
        type: String,
        required: true,
        enum: ["Pending", "Processing", "Shipped", "Delivered", "Cancelled", "Return Request", "Returned"],
        default: "Pending"
    },
    cancelReason: { type: String, default: null },  
    returnReason: { type: String, default: null }, 
    createdOn:     { type: Date, default: Date.now, required: true },
    couponApplied: { type: Boolean, default: false }
});

const Order = mongoose.model("Order", orderSchema);
module.exports = Order;