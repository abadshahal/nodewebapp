const User = require("../../models/userSchema");
const Address = require("../../models/addressSchema");

const bcrypt = require("bcrypt");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { sendVerificationEmail } = require("../../utils/emailService");
const { generateOtp, hashOtp } = require("../../utils/otpUtils");
const httpStatus = require("../../constants/httpStatus");

// Multer Setup

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(process.cwd(), "public/uploads/profiles");
    if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `profile_${req.user.id}_${Date.now()}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = ["image/jpeg", "image/png", "image/webp"];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error("Only JPG, PNG, WebP allowed"), false);
};

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter,
});

//  Get Profile 
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).lean();
    const addresses = await Address.find({ userId: req.user.id }).sort({
      isDefault: -1,
      createdAt: -1,
    });

    res.render("user/profile", { user, addresses });
  } catch (err) {
    console.error("getProfile error:", err);
    res.redirect("/pageNotFound");
  }
};

// Get Edit Profile Page 

const getEditProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).lean();
    if (!user) return res.redirect("/home");

    res.render("user/edit-profile", {
      user,
      success: req.query.success || null,
      error: req.query.error || null,
    });
  } catch (err) {
    console.error("getEditProfile error:", err);
    res.redirect("/pageNotFound");
  }
};

// Update Profile 
const updateProfile = [
  upload.single("profileImage"),
  async (req, res) => {
    try {
      const { firstname, lastname, phone } = req.body;

      if (!firstname || !firstname.trim()) {
        return res.status(httpStatus.BAD_REQUEST).json({
          success: false,
          message: "First name is required",
        });
      }

      if (phone && !/^[6-9]\d{9}$/.test(phone.trim())) {
        return res.status(httpStatus.BAD_REQUEST).json({
          success: false,
          message: "Enter a valid 10-digit phone number",
        });
      }

      const updateData = {
        firstname: firstname.trim(),
        lastname: lastname ? lastname.trim() : "",
        phone: phone ? phone.trim() : null,
      };

      if (req.file) {
        const user = await User.findById(req.user.id);

        if (user.profileImage && user.profileImage.startsWith("/uploads/profiles/")) {
          const oldPath = path.join(process.cwd(), "public", user.profileImage);
          if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        }

        updateData.profileImage = `/uploads/profiles/${req.file.filename}`;
      }

      await User.findByIdAndUpdate(req.user.id, updateData, { new: true });

      return res.status(httpStatus.OK).json({
        success: true,
        message: "Profile updated successfully",
        imageUrl: updateData.profileImage || null,
      });
    } catch (err) {
      console.error("updateProfile error:", err);
      return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Server error. Please try again.",
      });
    }
  },
];

//  Remove Profile Image 

const removeProfileImage = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (user.profileImage && user.profileImage.startsWith("/uploads/profiles/")) {
      const oldPath = path.join(process.cwd(), "public", user.profileImage);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    user.profileImage = "";
    await user.save();

    return res.status(httpStatus.OK).json({ success: true });
  } catch (err) {
    console.error("removeProfileImage error:", err);
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Server error",
    });
  }
};

//  Send Email Change OTP 

const sendEmailOtp = async (req, res) => {
  try {
    const { newEmail } = req.body;

    if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      return res.status(httpStatus.BAD_REQUEST).json({
        success: false,
        message: "Invalid email address",
      });
    }

    const existing = await User.findOne({ email: newEmail.toLowerCase() });
    if (existing) {
      return res.status(httpStatus.CONFLICT).json({
        success: false,
        message: "Email already in use",
      });
    }

    const otp = generateOtp();

    const emailSent = await sendVerificationEmail(newEmail, otp);
    if (!emailSent) {
      return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Failed to send OTP",
      });
    }

    await User.findByIdAndUpdate(req.user.id, {
      otp: hashOtp(otp),
      otpExpiry: Date.now() + 5 * 60 * 1000,
    });

    return res.status(httpStatus.OK).json({ success: true });
  } catch (err) {
    console.error("sendEmailOtp error:", err);
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Server error",
    });
  }
};

// verify email change otp

const verifyEmailOtp = async (req, res) => {
  try {
    const { newEmail, otp } = req.body;

    if (!newEmail || !otp) {
      return res.status(httpStatus.BAD_REQUEST).json({
        success: false,
        message: "Email and OTP required",
      });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(httpStatus.NOT_FOUND).json({
        success: false,
        message: "User not found",
      });
    }

    if (Date.now() > user.otpExpiry) {
      return res.status(httpStatus.BAD_REQUEST).json({
        success: false,
        message: "OTP expired. Please request a new one.",
      });
    }

    if (user.otp !== hashOtp(otp)) {
      return res.status(httpStatus.BAD_REQUEST).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    const taken = await User.findOne({
      email: newEmail.toLowerCase(),
      _id: { $ne: user._id },
    });
    if (taken) {
      return res.status(httpStatus.CONFLICT).json({
        success: false,
        message: "Email already in use",
      });
    }

    user.email = newEmail.toLowerCase().trim();
    user.otp = null;
    user.otpExpiry = null;
    await user.save();

    return res.status(httpStatus.OK).json({ success: true });
  } catch (err) {
    console.error("verifyEmailOtp error:", err);
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Server error",
    });
  }
};

//change password

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(httpStatus.BAD_REQUEST).json({
        success: false,
        message: "All fields required",
      });
    }

    if (newPassword.length < 8) {
      return res.status(httpStatus.BAD_REQUEST).json({
        success: false,
        message: "Password must be at least 8 characters",
      });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(httpStatus.NOT_FOUND).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.isGoogleUser && !user.password) {
      return res.status(httpStatus.BAD_REQUEST).json({
        success: false,
        message: "Google accounts cannot change password here",
      });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(httpStatus.UNAUTHORIZED).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    const isSame = await bcrypt.compare(newPassword, user.password);
    if (isSame) {
      return res.status(httpStatus.BAD_REQUEST).json({
        success: false,
        message: "New password must be different from current",
      });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    return res.status(httpStatus.OK).json({
      success: true,
      message: "Password updated successfully",
    });
  } catch (err) {
    console.error("changePassword error:", err);
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Server error",
    });
  }
};

//change password page

const changePasswordPage = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).lean();
    if (!user) return res.redirect("/signIn");
    res.render("user/change-password", { user });
  } catch (err) {
    console.error("changePasswordPage error:", err);
    res.redirect("/pageNotFound");
  }
};





module.exports = {
  getProfile,
  getEditProfile,
  updateProfile,
  removeProfileImage,
  sendEmailOtp,
  verifyEmailOtp,
  changePasswordPage,
  changePassword,


   
};