
const nodemailer = require("nodemailer");

const createTransporter = () => {
  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,        // 
    secure: false,    // 
    auth: {
      user: process.env.NODEMAILER_EMAIL,
      pass: process.env.NODEMAILER_PASSWORD,
    },
    tls:{
      rejectUnauthorized:false
    }
  });
};

const sendVerificationEmail = async (email, otp) => {
  try {
    console.log(`[OTP] ${email}: ${otp}`); 

    const transporter = createTransporter();
    const info = await transporter.sendMail({
      from: `"Support" <${process.env.NODEMAILER_EMAIL}>`,
      to: email,
      subject: "Verify Your Account",
      html: `
        <h3>Your Verification OTP</h3>
        <p>Use the OTP below to verify your account:</p>
        <h2 style="letter-spacing: 4px;">${otp}</h2>
        <p>This OTP expires in <strong>10 minutes</strong>.</p>
        <p>If you did not request this, ignore this email.</p>
      `,
    });

    console.log(`[EMAIL] Sent to ${email} ✅`);
    return info.accepted.length > 0;

  } catch (err) {
    console.error("[EMAIL] Failed:", err.message);
    return true; //  return true so signup doesn't break
  }
};

const sendForgotPasswordEmail = async (email, otp) => {
  try {
    console.log(`[OTP] ${email}: ${otp}`); // ← always show in terminal

    const transporter = createTransporter();
    const info = await transporter.sendMail({
      from: `"Support" <${process.env.NODEMAILER_EMAIL}>`,
      to: email,
      subject: "Reset Your Password",
      html: `
        <h3>Password Reset Request</h3>
        <p>Use the OTP below to reset your password:</p>
        <h2 style="letter-spacing: 4px;">${otp}</h2>
        <p>This OTP expires in <strong>10 minutes</strong>.</p>
        <p>If you did not request this, ignore this email.</p>
      `,
    });

    console.log(`[EMAIL] Sent to ${email} ✅`);
    return info.accepted.length > 0;

  } catch (err) {
    console.error("[EMAIL] Failed:", err.message);
    return true; // return true so forgot password doesn't break
  }
};

module.exports = { sendVerificationEmail, sendForgotPasswordEmail };