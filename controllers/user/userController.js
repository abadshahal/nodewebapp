const User=require("../../models/userSchema");
const { render } = require("../../app")
const nodemailer=require("nodemailer");
const jwt=require("jsonwebtoken");
const bcrypt=require("bcrypt")
const crypto = require("crypto");
const multer=require("multer");

const path=require("path")
const fs=require("fs");




const generateToken = (user) => {
  return jwt.sign(
    { 
      id: user._id, 
      email: user.email,  
      role: "user" 
    },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );
};


const generateOtp = () => {
  return crypto.randomInt(100000, 999999).toString();
};


const sendVerificationEmail = async (email, otp) => {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.NODEMAILER_EMAIL,
        pass: process.env.NODEMAILER_PASSWORD,
      },
     tls:{
      rejectUnauthorized:false
     }
     
    });

 
    await transporter.verify();
    console.log("SMTP READY ✅");
    console.log(otp)

     const info = await transporter.sendMail({
      from: process.env.NODEMAILER_EMAIL,
      to: email,
      subject: "Verify Your Account",
      html: `<h3>Your OTP: ${otp}</h3>`,
    });

       return info.accepted.length > 0;
  } catch (err) {
    console.error("Email error:", err);
    return false;
  }
};

const loadLoginPage = (req, res) => {
  res.render("signIn");
};


const loadSignupPage = (req, res) => {
  res.render("signup");
};






const pageNotFound = (req, res) => {
  res.render("page-404");
};







const loadHomepage = async (req, res) => {
  try {
    let userData = null;

   
    if (req.user) {
      userData = await User.findById(req.user.id).lean();
    }

   
    res.render("home", {
      user: userData
    });

  } catch (error) {
    console.log("Homepage Error:", error);
    res.redirect("/pageNotFound");
  }
};




const googleCallback = (req, res) => {
  try {
    const user = req.user;
    console.log("google user:",user)

     if (user.isBlocked) {
      return res.redirect("/signIn?error=blocked");
    }

const token=generateToken(user)
console.log("token generated:",token)

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite:"lax"
    });

    console.log("cookie set, redirecting....")

    res.redirect("/home");

  } catch (error) {
    console.error("Google auth error:", error);
    res.redirect("/signup");
  }
};






const signup = async (req, res) => {
  try {
    const { firstname, lastname, email, phone, password, confirmPassword } = req.body;

    if (password !== confirmPassword) {
      return res.render("signup", { message: "Passwords do not match" });
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.render("signup", { message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const otp = generateOtp();

    const emailSent = await sendVerificationEmail(email, otp);

    if (!emailSent) {
      return res.render("signup", { message: "Failed to send OTP" });
    }


    const user = new User({
      firstname,
      lastname,
      email,
      phone,
      password: hashedPassword,
      otp,
      otpExpiry: Date.now() + 5 * 60 * 1000,
      isVerified: false,
    });
    await user.save();

    
    res.render("verify-otp", { email });

  } catch (err) {
    console.error("Signup error:", err);
    res.redirect("/pageNotFound");
  }
};



const verifyOtp = async (req, res) => {
  const {otp,email} = req.body;
  console.log(otp)
  console.log(email)
  try {

  

    
    
    if (!email) {
      return res.json({ success: false, message: "Email required" });
    }
    
    
    const user = await User.findOne({ email});
    if (!user) {
      return res.json({ success: false, message: "User not found" });
    }
    
    if (String(user.otp) !== String(otp) || Date.now() > user.otpExpiry) {
      return res.json({ success: false, message: "Invalid or expired OTP" });
    }
    
    user.isVerified = true;
    user.otp = null;
    user.otpExpiry = null;

    await user.save();

    const token = generateToken(user);

    res.cookie("token", token, { httpOnly: true });

    res.json({ success: true, redirectUrl: "/home" });


  } catch (error) {
    console.error("verify otp error:",error)
    res.json({ success: false, message: "Server error" });
  }
};



const resendOtp = async (req, res) => {
  try {
    const { email } = req.body;
    

      if (!email) {
      return res.json({ success: false, message: "Email required" });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.json({ success: false,message:"User not found" });
    }

    const otp = generateOtp();

    user.otp = otp;
    user.otpExpiry = Date.now() + 5 * 60 * 1000;

    
    const emailSent = await sendVerificationEmail(email, otp);
    
    if (!emailSent) {
      return res.json({ success: false,message:"failed to resend" });
    }
    await user.save();

    res.json({ success: true });

  } catch (error) {
    console.error("resent otp error",error);
    res.json({ success: false,message:"server error" });
  }
};



const signIn = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email, isAdmin: false });

    if (!user) {
      return res.json({ success: false, message: "User not found" });
    }

    if (user.isBlocked) {
      return res.json({ success: false, message: "Your account has been blocked" });
    }

    if (!user.isVerified) {
      return res.json({ success: false, message: "Please verify your email first" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.json({ success: false, message: "Incorrect password" });
    }

    const token = generateToken(user);

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    return res.json({ success: true, redirectUrl: "/home" });

  } catch (error) {
    console.error("SignIn error:", error);
    return res.json({ success: false, message: "Login failed, please try again" });
  }
};



const logout = (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict"
  });
  res.redirect("/home");
};








const forgotPasswordPage = (req, res) => {
  const token = req.cookies.token;
  let email = "";

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      email = decoded.email;
    } catch (err) {}
  }

  res.render("forgot-password", { error: null, success: null, email });
};


const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) return res.json({ success: false, message: "Email is required." });

    const user = await User.findOne({ email, isAdmin: false });
    if (!user) return res.json({ success: false, message: "No account found." });
    if (!user.isVerified) return res.json({ success: false, message: "Account not verified." });
    if (user.isBlocked) return res.json({ success: false, message: "Account is blocked." });

    const otp = generateOtp();
    user.otp = otp;
    user.otpExpiry = Date.now() + 5 * 60 * 1000;
    await user.save();

    const emailSent = await sendVerificationEmail(user.email, otp);
    if (!emailSent) return res.json({ success: false, message: "Failed to send OTP." });

    return res.json({
      success: true,
      redirectUrl: `/verify-forgot-otp?email=${encodeURIComponent(user.email)}`
    });

  } catch (err) {
    console.error("Forgot password error:", err);
    return res.json({ success: false, message: "Server error." });
  }
};

const verifyForgotOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.json({ success: false, message: "OTP required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.json({ success: false, message: "User not found" });
    }

    if (String(user.otp) !== String(otp) || Date.now() > user.otpExpiry) {
      return res.json({ success: false, message: "Invalid or expired OTP" });
    }

    // Clear OTP
    user.otp = null;
    user.otpExpiry = null;
    await user.save();

    // Set reset token cookie
    const token = generateToken(user);
    res.cookie("resetToken", token, { httpOnly: true });

    // Return JSON with redirect URL instead of redirecting directly
    return res.json({
      success: true,
      redirectUrl: `/reset-password?email=${encodeURIComponent(email)}`
    });

  } catch (error) {
    console.error(error);
    return res.json({ success: false, message: "Server error" });
  }
};


const resetPasswordPage = (req, res) => {
  const email = req.query.email || '';
  if (!email) return res.redirect('/forgot-password');
  if (!req.cookies.resetToken) return res.redirect('/forgot-password');
  res.render('change-password', { email });
};










const resetPassword = async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    
    if (!email || !newPassword) {
      return res.json({ success: false, message: 'All fields are required.' });
    }

    if (newPassword.length < 8) {
      return res.json({ success: false, message: 'Password must be at least 8 characters.' });
    }

   
    const token = req.cookies.resetToken;
    if (!token) {
      return res.json({ success: false, message: 'Session expired. Please restart the password reset.' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.json({ success: false, message: 'Invalid or expired session. Please restart.' });
    }

   
    if (decoded.email !== email) {
      return res.json({ success: false, message: 'Email mismatch. Please restart the password reset.' });
    }

    
    const user = await User.findOne({ email, isAdmin: false });
    if (!user) {
      return res.json({ success: false, message: 'User not found.' });
    }

    if (user.isBlocked) {
      return res.json({ success: false, message: 'Your account has been blocked.' });
    }

    
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();


    

    // ── Clear reset cookie ──
    res.clearCookie('resetToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
    });

   const authToken = generateToken(user);

res.cookie('token', authToken, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  maxAge: 7 * 24 * 60 * 60 * 1000,
});

    return res.json({ success: true });

  } catch (err) {
    console.error('Reset password error:', err);
    return res.json({ success: false, message: 'Server error. Please try again.' });
  }
};




const resendForgotOtp = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) return res.json({ success: false, message: "Email required" });

    const user = await User.findOne({ email, isAdmin: false });
    if (!user) return res.json({ success: false, message: "User not found" });
    if (user.isBlocked) return res.json({ success: false, message: "Account is blocked" });

    const otp = generateOtp();
    user.otp = otp;
    user.otpExpiry = Date.now() + 5 * 60 * 1000;
    await user.save();

    const emailSent = await sendVerificationEmail(email, otp);
    if (!emailSent) return res.json({ success: false, message: "Failed to send OTP" });

    return res.json({ success: true });

  } catch (error) {
    console.error("Resend forgot OTP error:", error);
    return res.json({ success: false, message: "Server error" });
  }
};

const verifyForgotOtpPage = (req, res) => {
  const email = req.query.email || "";
  if (!email) return res.redirect("/forgot-password");
  res.render("verify-forgot-otp", { email });
};




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
resendForgotOtp
};






