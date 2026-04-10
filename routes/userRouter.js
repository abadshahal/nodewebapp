const express = require("express");
const router = express.Router();
const userController = require("../controllers/user/userController");
const passport = require("passport");
const verifyToken = require("../middlewares/verifyToken");


// const redirectIfLoggedIn = (req, res, next) => {
//   res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
//   res.set('Pragma', 'no-cache');
//   res.set('Expires', '0');
  
//   const token = req.cookies.token;
//   if (token) {
//     try {
//       const jwt = require('jsonwebtoken');
//       const decoded = jwt.verify(token, process.env.JWT_SECRET);
//       if (decoded.role === 'user') return res.redirect('/home');
//     } catch (err) {}
//   }
//   next();
// };


// router.get("/signIn", redirectIfLoggedIn, userController.loadLoginPage);
// router.get("/signup", redirectIfLoggedIn, userController.loadSignupPage)


router.get("/signIn", userController.loadLoginPage);
router.post("/signIn", userController.signIn);

router.get("/signup", userController.loadSignupPage);
router.post("/signup", userController.signup);

router.post("/verify-otp", userController.verifyOtp);
router.post("/resend-otp", userController.resendOtp);



router.get("/auth/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false,
  })
);

router.get("/auth/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/signup",
    session: false,
  }),
  userController.googleCallback
);



router.get("/home", verifyToken, userController.loadHomepage);



router.get("/logout", userController.logout);
router.get("/pageNotFound", userController.pageNotFound);








router.get("/forgot-password",userController.forgotPasswordPage)
router.post("/forgot-password",userController.forgotPassword);
router.get("/verify-forgot-otp",userController.verifyForgotOtpPage)
router.post('/verify-forgot-otp',userController.verifyForgotOtp);
router.get('/reset-password',userController. resetPasswordPage);
router.post('/reset-password',userController.    resetPassword);
router.post('/resend-forgot-otp',userController.resendForgotOtp);








module.exports = router;
