const User = require("../../models/userSchema");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const httpStatus = require("../../constants/httpStatus");


const loadAdminLogin = (req, res) => {
  return res.render("admin/login");
};



const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log(email)
    console.log(password)

    if (!email || !password) {
      return res.status(httpStatus.BAD_REQUEST).render("admin/login", {
        error: "Email and password are required",
      });
    }

    const user = await User.findOne({ email, isAdmin: true });
    const isMatch = user ? await bcrypt.compare(password, user.password) : false;

    if (!user || !isMatch) {
      return res.status(httpStatus.UNAUTHORIZED).render("admin/login", {
        error: "Invalid credentials",
      });
    }

    const token = jwt.sign(
      { id: user._id, role: "admin" },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.cookie("adminToken", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 24 * 60 * 60 * 1000,
    });

    return res.redirect("/admin/customers");

  } catch (error) {
    console.error("Admin login error:", error);
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).render("admin/login", {
      error: "Server error. Please try again.",
    });
  }
};


const logout = (req, res) => {
  res.clearCookie("adminToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  });
  res.redirect("/admin/login");
};



module.exports = {
  loadAdminLogin,
  login,
  logout,
};