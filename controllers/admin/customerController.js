const User = require("../../models/userSchema");

const Order = require("../../models/orderSchema"); 

const httpStatus = require("../../constants/httpStatus"); 



//  Get Customers

const getCustomers = async (req, res) => {
  try {
    const { search = "", status = "", sort = "newest", page = 1 } = req.query;
    const LIMIT       = 10;
    const currentPage = Math.max(1, parseInt(page, 10));

    const filter = { role:"user"};

    if (search.trim()) {
      const rx = new RegExp(search.trim(), "i");
      filter.$or = [
        { firstname: rx },
        { lastname:  rx },
        { email:     rx },
        { phone:     rx },
      ];
    }

    if (status === "active")  filter.isBlocked = false;
    if (status === "blocked") filter.isBlocked = true;

    const sortMap = {
      newest: { createdAt: -1 },
      oldest: { createdAt:  1 },
      name:   { firstname:  1, lastname: 1 },
    };
    const sortQuery = sortMap[sort] || sortMap.newest;

    const totalCustomers = await User.countDocuments(filter);
    const totalPages     = Math.ceil(totalCustomers / LIMIT);

    const customers = await User.find(filter)
      .sort(sortQuery)
      .skip((currentPage - 1) * LIMIT)
      .limit(LIMIT)
      .populate("orderHistory", "_id")
      .lean();

    res.render("admin/customers", {
      customers,
      search,
      status,
      sort,
      currentPage,
      totalPages,
      totalCustomers,
      limit: LIMIT,
      adminName: req.admin?.firstname || "Admin",
    });

  } catch (err) {
    console.error("getCustomers error:", err);
    res.status(httpStatus.INTERNAL_SERVER_ERROR).send("Server error");
  }
};

//  Block Customer 

const blockCustomer = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isBlocked: true },
      { new: true }
    );

    if (!user) {
      return res.status(httpStatus.NOT_FOUND).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({ success: true, message: "User blocked successfully" });
  } catch (err) {
    console.error("blockCustomer error:", err);
    res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Server error",
    });
  }
};

//  Unblock Customer 

const unblockCustomer = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isBlocked: false },
      { new: true }
    );

    if (!user) {
      return res.status(httpStatus.NOT_FOUND).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({ success: true, message: "User unblocked successfully" });
  } catch (err) {
    console.error("unblockCustomer error:", err);
    res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Server error",
    });
  }
};



module.exports = {
  getCustomers,
  blockCustomer,
  unblockCustomer,
};