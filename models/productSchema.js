const mongoose = require('mongoose');
const { Schema } = mongoose;

//  Variant sub-schema
const variantSchema = new Schema({
  color        : { type: String, required: true },
  strapMaterial: { type: String, default: '' },
  price        : { type: Number, required: true },
  stock        : { type: Number, default: 0 },
  offerValue   : { type: Number, default: 0 },   // percentage e.g. 10 = 10% off
  images       : { type: [String], default: [] }, // Cloudinary URLs
}, { _id: true });

//  Product schema 
const productSchema = new Schema({
  name        : { type: String, required: true, trim: true },
  description : { type: String, required: true, trim: true },
  brand       : { type: String, default: '',    trim: true },
  category    : { type: Schema.Types.ObjectId, ref: 'Category', required: true },


  basePrice   : { type: Number, default: 0 },


  totalStock  : { type: Number, default: 0 },

  isListed    : { type: Boolean, default: true },

  specifications: {
    warranty       : { type: String, default: '' },
    waterResistance: { type: String, default: '' },
  },

  variants: { type: [variantSchema], default: [] },

}, { timestamps: true });

//Pre-save hook: keep totalStock & basePrice in sync with variants
productSchema.pre('save', async function () {
  if (this.variants && this.variants.length) {
    this.totalStock = this.variants.reduce((sum, v) => sum + (v.stock || 0), 0);
    this.basePrice  = Math.min(...this.variants.map(v => v.price));
  } else {
    this.totalStock = 0;
    this.basePrice  = 0;
  }
});

const Product = mongoose.model('Product', productSchema);
module.exports = Product;