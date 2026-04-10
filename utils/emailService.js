const nodemailer = require("nodemailer");


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


transporter.verify()
  .then(() => console.log("SMTP READY ✅"))
  .catch(err => console.error("SMTP ERROR ❌", err));


const sendVerificationEmail = async (email, otp) => {
  try {
    if (process.env.NODE_ENV !== "production") {
      console.log("OTP:", otp);
    }

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

module.exports = { sendVerificationEmail };