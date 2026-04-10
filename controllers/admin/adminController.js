const User=require("../../models/userSchema");
const Order=require("../../models/orderSchema")
const bcrypt=require("bcrypt")
const jwt=require("jsonwebtoken");

const loadAdminLogin=async(req,res)=>{
    try {

        return res.render("login")
    } catch (error) {
        return res.redirect("/pageNotFound")
    }
}


const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log("admin email",email)
    console.log("admin password",password)

    if (!email || !password) {
      return res.status(400).render("login", { error: "Email and password are required" });
    }

    const user = await User.findOne({ email, isAdmin: true });
    const isMatch = user ? await bcrypt.compare(password, user.password) : false;

    if (!user || !isMatch) {
      return res.status(401).render("login", { error: "Invalid credentials" });
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
    return res.status(500).render("login", { error: "Server error. Please try again." });
  }
};


const logout = (req, res) => {
  res.clearCookie("adminToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict"
  });
  res.redirect("/admin/login");
};


module.exports={
    loadAdminLogin,
    login,
    logout
    
   
    
}