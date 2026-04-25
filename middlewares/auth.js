const jwt = require("jsonwebtoken");
const User = require("../models/userSchema");

const verifyUser = async (req, res, next) => {
  try {
    const token = req.cookies.userToken;
    if (!token) return res.redirect("/signIn");

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== "user") return res.redirect("/signIn");

    const user = await User.findById(decoded.id);
    if (!user || user.isBlocked) {
      res.clearCookie("userToken");
      return res.redirect("/signIn");
    }

    req.user = decoded;
    next();
  } catch (error) {
    res.clearCookie("userToken");
    return res.redirect("/signIn");
  }
};

const verifyAdmin = (req, res, next) => {
  try {
   // no cache on admin protected route
    res.set({
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, private",
      "Pragma":        "no-cache",
      "Expires":       "-1",
    });

    const token = req.cookies.adminToken;
    if (!token) return res.redirect("/admin/login");

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== "admin") return res.redirect("/admin/login");

    req.admin = decoded;
    next();
  } catch (error) {
    res.clearCookie("adminToken");
    return res.redirect("/admin/login");
  }
};

const errorHandler = (err, req, res, next) => {
  console.error(`[ERROR] ${err.message}`);
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  if (req.xhr || req.headers.accept?.includes("application/json")) {
    return res.status(statusCode).json({ success: false, message });
  }
  return res.status(statusCode).render("page-404");
};


const attachUser = async (req, res, next) => {
  try {
    const token = req.cookies.userToken;
    if (!token) {
      req.user = null;
      return next();
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    req.user = (user && !user.isBlocked) ? user : null;
  } catch (error) {
    req.user = null;
  }
  next();
};

module.exports = { verifyUser, verifyAdmin, errorHandler, attachUser };