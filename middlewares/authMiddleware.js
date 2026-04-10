const verifyToken = require("../middlewares/verifyToken");
const jwt = require("jsonwebtoken");
const requireAuth = (req, res, next) => {
  verifyToken(req, res, () => {
    if (!req.user) {
      return res.redirect("/login"); // if no JWT, redirect
    }
    next();
  });
};

module.exports = requireAuth;