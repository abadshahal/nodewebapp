const express = require("express");
const router = express.Router();
const profileController = require("../controllers/user/profileController");
const addressController = require("../controllers/user/addressController");
const verifyToken = require("../middlewares/verifyToken");
const requireAuth=require("../middlewares/authMiddleware")


router.use(verifyToken, (req, res, next) => {
  if (!req.user) return res.redirect("/signIn");
  next();
});





router.get("/profile",profileController.getProfile);
router.get("/profile/edit",profileController.getEditProfile);
router.post("/profile/update",profileController.updateProfile);
router.post("/profile/upload-image",profileController.uploadProfileImage);
router.post("/profile/remove-image",profileController.removeProfileImage);

router.post("/profile/email-otp",        profileController.sendEmailOtp);
router.post("/profile/verify-email-otp", profileController.verifyEmailOtp);



router.post("/profile/change-password", profileController.changePassword);



router.get   ("/profile/address/add",          addressController.getAddAddress);
router.post  ("/profile/address/add",          addressController.postAddAddress);
router.get   ("/profile/address/edit/:id",     addressController.getEditAddress);
router.post  ("/profile/address/edit/:id",     addressController.postEditAddress);
router.delete("/profile/address/delete/:id",   addressController.deleteAddress);
router.post  ("/profile/address/default/:id",  addressController.setDefaultAddress);


router.get("/profile/change-password", profileController.changePasswordPage);
router.post("/profile/change-password", profileController.changePassword);

module.exports = router;
