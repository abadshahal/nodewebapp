const express = require("express");
const router = express.Router();
const profileController = require("../controllers/user/profileController");
const addressController = require("../controllers/user/addressController");
const { verifyUser } = require("../middlewares/auth"); 



router.use(verifyUser);




// profile
router.get("/", profileController.getProfile);
router.get("/edit", profileController.getEditProfile);
router.post("/update", profileController.updateProfile);
router.post("/remove-image", profileController.removeProfileImage);

// email change
router.post("/email-otp", profileController.sendEmailOtp);
router.post("/verify-email-otp", profileController.verifyEmailOtp);




// chnage pass
router.get("/change-password", profileController.changePasswordPage); 
router.post("/change-password", profileController.changePassword);   



// Addresses  management
router.get("/address/add", addressController.getAddAddress);
router.post("/address/add", addressController.postAddAddress);
router.get("/address/edit/:id", addressController.getEditAddress);
router.post("/address/edit/:id", addressController.postEditAddress);
router.delete("/address/delete/:id", addressController.deleteAddress);
router.post("/address/default/:id", addressController.setDefaultAddress);

module.exports = router;