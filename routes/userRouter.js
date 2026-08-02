const express = require("express");
const router = express.Router();
const passport = require("passport");
const authController = require("../controllers/user/authController");
const { loadShopPage, loadProductDetailPage } = require("../controllers/user/productController");
const { attachUser, verifyUser } = require("../middlewares/auth");

//cart
const {
  loadCartPage,
  addToCart,
  updateQuantity,
  removeFromCart,
  getCartCount,
} = require("../controllers/user/cartController");


const wishlistController=require("../controllers/user/wishlistController");
const checkoutController=require("../controllers/user/checkoutController")


//home
router.get("/", attachUser, authController.loadHomepage);
router.get("/home", attachUser, authController.loadHomepage);

//shop
router.get("/shop", attachUser, loadShopPage);
router.get("/shop/:id", attachUser, loadProductDetailPage);

//cart

router.get("/cart",verifyUser, loadCartPage);
router.post("/cart/add",verifyUser, addToCart);
router.patch("/cart/update-quantity",verifyUser, updateQuantity);
router.delete("/cart/remove/:itemId",verifyUser, removeFromCart);
router.get("/cart/count",verifyUser, getCartCount);

// Auth part 
router.get("/signIn", authController.loadLoginPage);
router.post("/signIn", authController.signIn);
router.get("/signup", authController.loadSignupPage);
router.post("/signup", authController.signup);
router.post("/verify-otp", authController.verifyOtp);
router.post("/resend-otp", authController.resendOtp);
router.get("/logout", authController.logout);

// google aouth
router.get("/auth/google", passport.authenticate("google", { scope: ["profile", "email"], session: false }));
router.get("/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/signup", session: false }),
  authController.googleCallback
);

// forgot pass
router.get("/forgot-password", authController.forgotPasswordPage);
router.post("/forgot-password", authController.forgotPassword);
router.get("/verify-forgot-otp", authController.verifyForgotOtpPage);
router.post("/verify-forgot-otp", authController.verifyForgotOtp);
router.get("/reset-password", authController.resetPasswordPage);
router.post("/reset-password", authController.resetPassword);
router.post("/resend-forgot-otp", authController.resendForgotOtp);

//wishlist

router.post("/wishlist/add",verifyUser,wishlistController.toggleWishlist);
router.get("/pageNotFound", authController.pageNotFound);
router.get("/wishlist",verifyUser,wishlistController.getWishlistPage);
router.delete("/wishlist/remove/:id",verifyUser,wishlistController.removeFromWishlist)
router.delete("/wishlist/empty",verifyUser,wishlistController.emptyWishlist)
router.post("/wishlist/move-all-to-cart",verifyUser, wishlistController.moveAllToCart);

router.get("/checkout", verifyUser,checkoutController.getCheckoutPage);
router.post("/checkout/place-order",verifyUser, checkoutController.placeOrder);
router.get("/checkout/success/:orderId", verifyUser,checkoutController.getOrderSuccess);

router.get("/order-success/:orderId",verifyUser,checkoutController.getOrderSuccess);


module.exports = router;