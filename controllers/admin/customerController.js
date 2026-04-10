const User = require("../../models/userSchema"); 


const getCustomers = async (req, res) => {
  try {
    const { search = "", status = "", sort = "newest", page = 1 } = req.query;
    const LIMIT       = 10;
    const currentPage = Math.max(1, parseInt(page, 10));

   
    const filter = { isAdmin: false };

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
      orders: { "orderHistory.length": -1 }, 
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

    
    res.render("customers", {
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
    res.status(500).send("Server error");
  }
};



const blockCustomer = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isBlocked: true },
      { new: true }
    );

    if (!user) return res.status(404).json({ success: false, message: "User not found" });

   

    res.json({ success: true, message: "User blocked successfully" });
  } catch (err) {
    console.error("blockCustomer error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};



const unblockCustomer = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isBlocked: false },
      { new: true }
    );

    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    res.json({ success: true, message: "User unblocked successfully" });
  } catch (err) {
    console.error("unblockCustomer error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};



module.exports={
    getCustomers,
    blockCustomer,
    unblockCustomer
}

