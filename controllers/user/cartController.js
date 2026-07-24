const Cart     = require("../../models/cartSchema");
const Wishlist = require("../../models/wishlistSchema");
const Product  = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const httpStatus = require("../../constants/httpStatus");
const User = require("../../models/userSchema");

const MAX_QTY_PER_ITEM = 5;

//  Helpers 

const resolveVariant = async (productId, variantId) => {
  const product = await Product.findById(productId).populate("category").lean();

  if (!product) return { error: "Product not found" };
  if (!product.isListed) return { error: "Product is unavailable" };
  if (!product.category?.isListed) return { error: "Product category is unavailable" };

  const variant = product.variants.find(
    (v) => v._id.toString() === variantId.toString()
  );
  if (!variant) return { error: "Variant not found" };

  return { product, variant };
};



const loadCartPage = async (req, res) => {
 
  if (!req.user) {
    return res.render("user/cart", {
      user: null,
      cartItems: [],
      subtotal: 0,
      hasOutOfStock: false,
      filters: {},
    });
  }

  try {
    const userId = req.user.id;

    let cart = await Cart.findOne({ userId })
      .populate({
        path: "items.productId",
        populate: { path: "category", select: "name isListed" },
      })
      .lean();

    let cartItems   = [];
    let cartUpdated = false;

    if (cart) {
      for (const item of cart.items) {
        const p = item.productId;
        if (!p || !p.isListed || !p.category?.isListed) {
          await Cart.updateOne({ userId }, { $pull: { items: { _id: item._id } } });
          cartUpdated = true;
          continue;
        }
        const variant = p.variants.find(
          (v) => v._id.toString() === item.variantId.toString()
        );
        cartItems.push({ ...item, variant });
      }
    }

    const subtotal     = cartItems.reduce((sum, i) => sum + i.totalPrice, 0);
    const hasOutOfStock = cartItems.some((i) => !i.variant || i.variant.stock === 0);

    res.render("user/cart", {
      user: req.user,
      cartItems,
      subtotal,
      hasOutOfStock,
      filters: {},
    });
  } catch (err) {
    console.error("loadCartPage error:", err);
    res.redirect("/pageNotFound");
  }
};

//  POST /cart/add 

const addToCart = async (req, res) => {
 
  if (!req.user) {
    return res.status(httpStatus.UNAUTHORIZED).json({
      success: false,
      message: "Please sign in to add items to your cart",
      redirect: "/signIn",
    });
  }

  try {
    const userId = req.user.id;
    const { productId, variantId, quantity = 1 } = req.body;

    if (!productId || !variantId) {
      return res.status(httpStatus.BAD_REQUEST).json({
        success: false,
        message: "Product and variant are required",
      });
    }

    const requestedQty = parseInt(quantity);
    if (isNaN(requestedQty) || requestedQty < 1) {
      return res.status(httpStatus.BAD_REQUEST).json({
        success: false,
        message: "Invalid quantity",
      });
    }

    const { product, variant, error } = await resolveVariant(productId, variantId);
    if (error) {
      return res.status(httpStatus.BAD_REQUEST).json({ success: false, message: error });
    }

    if (variant.stock === 0) {
      return res.status(httpStatus.BAD_REQUEST).json({
        success: false,
        message: "This variant is out of stock",
      });
    }

    const effectiveMax = Math.min(MAX_QTY_PER_ITEM, variant.stock);

    let cart = await Cart.findOne({ userId });
    if (!cart) cart = new Cart({ userId, items: [] });

    const existingItemIndex = cart.items.findIndex(
      (i) =>
        i.productId.toString() === productId &&
        i.variantId.toString() === variantId
    );

    if (existingItemIndex > -1) {
      const existingItem = cart.items[existingItemIndex];
      const newQty = existingItem.quantity + requestedQty;

      if (newQty > effectiveMax) {
        return res.status(httpStatus.BAD_REQUEST).json({
          success: false,
          message: `Maximum ${effectiveMax} units allowed for this item`,
        });
      }

      cart.items[existingItemIndex].quantity   = newQty;
      cart.items[existingItemIndex].price      = variant.price;
      cart.items[existingItemIndex].totalPrice = variant.price * newQty;
    } else {
      const finalQty = Math.min(requestedQty, effectiveMax);
      cart.items.push({
        productId : product._id,
        variantId : variant._id,
        quantity  : finalQty,
        price     : variant.price,
        totalPrice: variant.price * finalQty,
      });
    }

    await cart.save();

    await Wishlist.updateOne(
      { userId },
      { $pull: { products: { productId } } }
    );

    return res.status(httpStatus.OK).json({
      success: true,
      message: "Added to cart",
      cartCount: cart.items.length,
    });
  } catch (err) {
    console.error("addToCart error:", err);
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Failed to add to cart",
    });
  }
};

//  PATCH /cart/update-quantity 

const updateQuantity = async (req, res) => {
  if (!req.user) {
    return res.status(httpStatus.UNAUTHORIZED).json({
      success: false,
      message: "Please sign in to update your cart",
      redirect: "/signIn",
    });
  }

  try {
    const userId = req.user.id;
    const { itemId, action } = req.body;

    if (!itemId || !["increment", "decrement"].includes(action)) {
      return res.status(httpStatus.BAD_REQUEST).json({
        success: false,
        message: "Invalid request",
      });
    }

    const cart = await Cart.findOne({ userId });
    if (!cart) {
      return res.status(httpStatus.NOT_FOUND).json({
        success: false,
        message: "Cart not found",
      });
    }

    const item = cart.items.id(itemId);
    if (!item) {
      return res.status(httpStatus.NOT_FOUND).json({
        success: false,
        message: "Item not found in cart",
      });
    }

    const { variant, error } = await resolveVariant(item.productId, item.variantId);
    if (error) {
      return res.status(httpStatus.BAD_REQUEST).json({ success: false, message: error });
    }

    const effectiveMax = Math.min(MAX_QTY_PER_ITEM, variant.stock);

    if (action === "increment") {
      if (item.quantity >= effectiveMax) {
        return res.status(httpStatus.BAD_REQUEST).json({
          success: false,
          message: `Maximum ${effectiveMax} units allowed`,
        });
      }
      item.quantity += 1;
    } else {
      if (item.quantity <= 1) {
        return res.status(httpStatus.BAD_REQUEST).json({
          success: false,
          message: "Minimum quantity is 1. Use remove to delete item.",
        });
      }
      item.quantity -= 1;
    }

    item.totalPrice = item.price * item.quantity;
    await cart.save();

    const subtotal = cart.items.reduce((sum, i) => sum + i.totalPrice, 0);

    return res.status(httpStatus.OK).json({
      success: true,
      quantity: item.quantity,
      totalPrice: item.totalPrice,
      subtotal,
    });
  } catch (err) {
    console.error("updateQuantity error:", err);
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Failed to update quantity",
    });
  }
};

// DELETE /cart/remove/:itemId

const removeFromCart = async (req, res) => {
  if (!req.user) {
    return res.status(httpStatus.UNAUTHORIZED).json({
      success: false,
      message: "Please sign in to modify your cart",
      redirect: "/signIn",
    });
  }

  try {
    const userId = req.user.id;
    const { itemId } = req.params;

    const cart = await Cart.findOne({ userId });
    if (!cart) {
      return res.status(httpStatus.NOT_FOUND).json({
        success: false,
        message: "Cart not found",
      });
    }

    const itemExists = cart.items.id(itemId);
    if (!itemExists) {
      return res.status(httpStatus.NOT_FOUND).json({
        success: false,
        message: "Item not found in cart",
      });
    }

    cart.items.pull({ _id: itemId });
    await cart.save();

    const subtotal = cart.items.reduce((sum, i) => sum + i.totalPrice, 0);

    return res.status(httpStatus.OK).json({
      success: true,
      message: "Item removed from cart",
      cartCount: cart.items.length,
      subtotal,
    });
  } catch (err) {
    console.error("removeFromCart error:", err);
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Failed to remove item",
    });
  }
};

// GET /cart/count 

const getCartCount = async (req, res) => {
  
  if (!req.user) {
    return res.status(httpStatus.OK).json({ success: true, count: 0 }); //count 0 is for guest 
  }

  try {
    const cart  = await Cart.findOne({ userId: req.user.id }).lean();
    const count = cart ? cart.items.length : 0;
    return res.status(httpStatus.OK).json({ success: true, count });
  } catch (err) {
    console.error("getCartCount error:", err);
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ success: false, count: 0 });
  }
};



module.exports = {
  loadCartPage,
  addToCart,
  updateQuantity,
  removeFromCart,
  getCartCount,
};







