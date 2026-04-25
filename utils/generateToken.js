const jwt = require("jsonwebtoken");

const generateUserToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      email: user.email,
      role: "user",
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
};

const generateAdminToken = (admin) => {
  return jwt.sign(
    {
      id: admin._id,
      email: admin.email,
      role: "admin",
    },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );
};

module.exports = { generateUserToken, generateAdminToken };