const User = require("../../models/userSchema");
const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const Otp = require("../../models/otp")
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const { generateOtp, hashOtp } = require("../../utils/otpUtils");
const { sendVerificationEmail, sendForgotPasswordEmail } = require("../../utils/emailService");
const httpStatus = require("../../constants/httpStatus");

// Token Generator 

const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, email: user.email, role: "user" },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );
};

//  Cookie Options

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

// Page Renders 

const loadLoginPage = (req, res) => res.render("user/signIn");
const loadSignupPage = (req, res) => res.render("user/signup");
const pageNotFound = (req, res) => res.render("user/page-404");

const loadHomepage = async (req, res) => {
  try {
    const listedCategoryIds = await Category.find({ isListed: true }).distinct("_id");

    const baseQuery = {
      isListed: true,
      category: { $in: listedCategoryIds },
      // show all products including out-of-stock — badge/button handled in view
    };

    const [newArrivals, trending, explore] = await Promise.all([
      Product.find(baseQuery).sort({ createdAt: -1 }).limit(4).lean(),
      Product.find(baseQuery).sort({ totalStock: -1 }).limit(4).lean(),
      Product.find(baseQuery).sort({ basePrice: 1 }).skip(4).limit(4).lean(),
    ]);

    res.render("user/home", { user: req.user || null, newArrivals, trending, explore });
  } catch (error) {
    console.error("Homepage error:", error);
    res.redirect("/pageNotFound");
  }
};



const forgotPasswordPage = (req, res) => {
  res.render("user/forgot-password", { error: null, success: null, email: "" });
};

const verifyForgotOtpPage = (req, res) => {
  const email = req.query.email || "";
  if (!email) return res.redirect("/forgot-password");
  res.render("user/verify-forgot-otp", { email });
};

const resetPasswordPage = (req, res) => {
  const email = req.query.email || "";
  if (!email) return res.redirect("/forgot-password");
  if (!req.cookies.resetToken) return res.redirect("/forgot-password");
  res.render("user/reset-password", { email });
};

// ─── Google OAuth ──────────────────────────────────────────────────────────────

const googleCallback = (req, res) => {
  try {
    const user = req.user;
    if (user.isBlocked) return res.redirect("/signIn?error=blocked");
    const token = generateToken(user);
    res.cookie("userToken", token, cookieOptions);
    res.redirect("/home");
  } catch (error) {
    console.error("Google auth error:", error);
    res.redirect("/signup");
  }
};

// Signup

const signup = async (req, res) => {
  try {
    const { firstname, lastname, email, phone, password, confirmPassword } = req.body;

    if (password !== confirmPassword) {
      return res.status(httpStatus.BAD_REQUEST).render("user/signup", {
        message: "Passwords do not match",
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(httpStatus.CONFLICT).render("user/signup", {
        message: "User already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ firstname, lastname, email, phone, password: hashedPassword, isVerified: false });
    await user.save();

    const otp = generateOtp();
    await Otp.deleteMany({ userId: user._id });
    await Otp.create({ userId: user._id, otp: hashOtp(otp), expiry: new Date(Date.now() + 5 * 60 * 1000) });

    const emailSent = await sendVerificationEmail(email, otp);
    if (!emailSent) {
      await User.deleteOne({ _id: user._id });
      await Otp.deleteMany({ userId: user._id });
      return res.status(httpStatus.INTERNAL_SERVER_ERROR).render("user/signup", {
        message: "Failed to send OTP. Please try again.",
      });
    }

    res.render("user/verify-otp", { email });
  } catch (err) {
    console.error("Signup error:", err);
    res.redirect("/pageNotFound");
  }
};

// Verify OTP 

const verifyOtp = async (req, res) => {
  try {
    const { otp, email } = req.body;

    if (!email || !otp) {
      return res.status(httpStatus.BAD_REQUEST).json({ success: false, message: "Email and OTP are required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(httpStatus.NOT_FOUND).json({ success: false, message: "User not found" });
    }

    const otpRecord = await Otp.findOne({ userId: user._id });
    if (!otpRecord) {
      return res.status(httpStatus.BAD_REQUEST).json({ success: false, message: "OTP not found or expired." });
    }

    if (Date.now() > new Date(otpRecord.expiry).getTime()) {
      await Otp.deleteMany({ userId: user._id });
      return res.status(httpStatus.BAD_REQUEST).json({ success: false, message: "OTP has expired." });
    }

    if (otpRecord.otp !== hashOtp(otp)) {
      return res.status(httpStatus.BAD_REQUEST).json({ success: false, message: "Invalid OTP" });
    }

    await Otp.deleteMany({ userId: user._id });
    user.isVerified = true;
    await user.save();

    const token = generateToken(user);
    res.cookie("userToken", token, cookieOptions);
    res.status(httpStatus.OK).json({ success: true, redirectUrl: "/home" });
  } catch (error) {
    console.error("Verify OTP error:", error);
    res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ success: false, message: "Server error" });
  }
};

//  Resend OTP 

const resendOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(httpStatus.BAD_REQUEST).json({ success: false, message: "Email required" });

    const user = await User.findOne({ email });
    if (!user) return res.status(httpStatus.NOT_FOUND).json({ success: false, message: "User not found" });

    const otp = generateOtp();
    await Otp.deleteMany({ userId: user._id });
    await Otp.create({ userId: user._id, otp: hashOtp(otp), expiry: new Date(Date.now() + 5 * 60 * 1000) });

    const emailSent = await sendVerificationEmail(email, otp);
    if (!emailSent) return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ success: false, message: "Failed to resend OTP" });

    res.status(httpStatus.OK).json({ success: true });
  } catch (error) {
    console.error("Resend OTP error:", error);
    res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ success: false, message: "Server error" });
  }
};

// Sign In

const signIn = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email, role: "user" });
    if (!user) return res.status(httpStatus.NOT_FOUND).json({ success: false, message: "User not found" });
    if (user.isBlocked) return res.status(httpStatus.FORBIDDEN).json({ success: false, message: "Your account has been blocked" });
    if (!user.isVerified) return res.status(httpStatus.UNAUTHORIZED).json({ success: false, message: "Please verify your email first" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(httpStatus.UNAUTHORIZED).json({ success: false, message: "Incorrect password" });

    const token = generateToken(user);
    res.cookie("userToken", token, cookieOptions);
    res.status(httpStatus.OK).json({ success: true, redirectUrl: "/home" });
  } catch (error) {
    console.error("SignIn error:", error);
    res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ success: false, message: "Login failed, please try again" });
  }
};

//  Logout 

const logout = (req, res) => {
  res.clearCookie("userToken", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict" });
  res.redirect("/home");
};

//  Forgot Password

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(httpStatus.BAD_REQUEST).json({ success: false, message: "Email is required" });

    const user = await User.findOne({ email, isAdmin: false });
    if (!user) return res.status(httpStatus.NOT_FOUND).json({ success: false, message: "No account found" });
    if (!user.isVerified) return res.status(httpStatus.UNAUTHORIZED).json({ success: false, message: "Account not verified" });
    if (user.isBlocked) return res.status(httpStatus.FORBIDDEN).json({ success: false, message: "Account is blocked" });

    const otp = generateOtp();
    await Otp.deleteMany({ userId: user._id });
    await Otp.create({ userId: user._id, otp: hashOtp(otp), expiry: new Date(Date.now() + 5 * 60 * 1000) });

    const emailSent = await sendForgotPasswordEmail(user.email, otp);
    if (!emailSent) return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ success: false, message: "Failed to send OTP" });

    res.status(httpStatus.OK).json({
      success: true,
      redirectUrl: `/verify-forgot-otp?email=${encodeURIComponent(user.email)}`,
    });
  } catch (err) {
    console.error("Forgot password error:", err);
    res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ success: false, message: "Server error" });
  }
};

//  Verify Forgot OTP

const verifyForgotOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(httpStatus.BAD_REQUEST).json({ success: false, message: "Email and OTP are required" });

    const user = await User.findOne({ email });
    if (!user) return res.status(httpStatus.NOT_FOUND).json({ success: false, message: "User not found" });

    const otpRecord = await Otp.findOne({ userId: user._id });
    if (!otpRecord) return res.status(httpStatus.BAD_REQUEST).json({ success: false, message: "OTP not found or expired." });

    if (Date.now() > new Date(otpRecord.expiry).getTime()) {
      await Otp.deleteMany({ userId: user._id });
      return res.status(httpStatus.BAD_REQUEST).json({ success: false, message: "OTP has expired." });
    }

    if (otpRecord.otp !== hashOtp(otp)) return res.status(httpStatus.BAD_REQUEST).json({ success: false, message: "Invalid OTP" });

    await Otp.deleteMany({ userId: user._id });

    const resetToken = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "10m" }
    );

    res.cookie("resetToken", resetToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 10 * 60 * 1000,
    });

    res.status(httpStatus.OK).json({
      success: true,
      redirectUrl: `/reset-password?email=${encodeURIComponent(email)}`,
    });
  } catch (error) {
    console.error("Verify forgot OTP error:", error);
    res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ success: false, message: "Server error" });
  }
};

//Reset Password

const resetPassword = async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    if (!email || !newPassword) return res.status(httpStatus.BAD_REQUEST).json({ success: false, message: "All fields are required" });
    if (newPassword.length < 8) return res.status(httpStatus.BAD_REQUEST).json({ success: false, message: "Password must be at least 8 characters" });

    const token = req.cookies.resetToken;
    if (!token) return res.status(httpStatus.UNAUTHORIZED).json({ success: false, message: "Session expired. Please restart." });

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(httpStatus.UNAUTHORIZED).json({ success: false, message: "Invalid or expired session. Please restart." });
    }

    if (decoded.email !== email) return res.status(httpStatus.FORBIDDEN).json({ success: false, message: "Email mismatch. Please restart." });

    const user = await User.findOne({ email, isAdmin: false });
    if (!user) return res.status(httpStatus.NOT_FOUND).json({ success: false, message: "User not found" });
    if (user.isBlocked) return res.status(httpStatus.FORBIDDEN).json({ success: false, message: "Your account has been blocked" });

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.clearCookie("resetToken", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict" });

    const authToken = generateToken(user);
    res.cookie("userToken", authToken, cookieOptions);
    res.status(httpStatus.OK).json({ success: true, redirectUrl: "/home" });
  } catch (err) {
    console.error("Reset password error:", err);
    res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ success: false, message: "Server error. Please try again." });
  }
};

// Resend Forgot OTP 

const resendForgotOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(httpStatus.BAD_REQUEST).json({ success: false, message: "Email required" });

    const user = await User.findOne({ email, isAdmin: false });
    if (!user) return res.status(httpStatus.NOT_FOUND).json({ success: false, message: "User not found" });
    if (user.isBlocked) return res.status(httpStatus.FORBIDDEN).json({ success: false, message: "Account is blocked" });

    const otp = generateOtp();
    await Otp.deleteMany({ userId: user._id });
    await Otp.create({ userId: user._id, otp: hashOtp(otp), expiry: new Date(Date.now() + 5 * 60 * 1000) });

    const emailSent = await sendForgotPasswordEmail(email, otp);
    if (!emailSent) return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ success: false, message: "Failed to send OTP" });

    res.status(httpStatus.OK).json({ success: true });
  } catch (error) {
    console.error("Resend forgot OTP error:", error);
    res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ success: false, message: "Server error" });
  }
};



module.exports = {
  loadLoginPage,
  loadSignupPage,
  loadHomepage,
  pageNotFound,
  signup,
  verifyOtp,
  resendOtp,
  signIn,
  logout,
  googleCallback,
  forgotPasswordPage,
  forgotPassword,
  verifyForgotOtpPage,
  verifyForgotOtp,
  resetPasswordPage,
  resetPassword,
  resendForgotOtp,
};