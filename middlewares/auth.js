const jwt = require("jsonwebtoken");

// ✅ USER VERIFY
const verifyUser = (req, res, next) => {
  try {
    const token = req.cookies.userToken;

    if (!token) return res.redirect("/signIn");

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role !== "user") {
      return res.redirect("/signIn");
    }

    req.user = decoded;
    next();

  } catch (error) {
    return res.redirect("/home");
  }
};

// ✅ ADMIN VERIFY
const verifyAdmin = (req, res, next) => {
  try {
    const token = req.cookies.adminToken;

    if (!token) return res.redirect("/admin/login");

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role !== "admin") {
      return res.redirect("/admin/login");
    }

    req.admin = decoded;
    next();

  } catch (error) {
    return res.redirect("/admin/login");
  }
};

module.exports = { verifyUser, verifyAdmin };