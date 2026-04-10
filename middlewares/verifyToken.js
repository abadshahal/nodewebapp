const jwt = require('jsonwebtoken');
const User = require('../models/userSchema');

const verifyToken = async (req, res, next) => {
  try {
    const token = req.cookies.token;

    if (!token) {
      req.user = null;
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

   
    if (decoded.role === 'admin') {
      req.user = decoded;
      return next();
    }

   
    const user = await User.findById(decoded.id);

    if (!user || user.isBlocked) {
      res.clearCookie('token');
      req.user = null;
      return res.redirect('/signIn');
    }

    req.user = decoded;
    next();

  } catch (error) {
    req.user = null;
    next();
  }
};

module.exports = verifyToken;