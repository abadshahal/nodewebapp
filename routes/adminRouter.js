const express = require("express");
const router = express.Router();
const adminController = require("../controllers/admin/adminController");
const { verifyAdmin } = require("../middlewares/auth");
const customerController = require("../controllers/admin/customerController");
const noCache=require("../middlewares/noCache")


router.use(noCache)


router.get("/login", (req, res, next) => {
  const token = req.cookies.adminToken;
  if (token) {
    try {
      const decoded = require("jsonwebtoken").verify(token, process.env.JWT_SECRET);
      if (decoded.role === "admin") return res.redirect("/admin/customers");
    } catch (err) {
      console.log("admin side error",err)
    }
  }
  next();
}, adminController.loadAdminLogin);

router.post("/login", adminController.login);
router.get("/logout", adminController.logout);

// ── Protected routes ──
router.get("/customers", verifyAdmin, customerController.getCustomers);
router.post("/customers/:id/block", verifyAdmin, customerController.blockCustomer);
router.post("/customers/:id/unblock", verifyAdmin, customerController.unblockCustomer);

module.exports = router;