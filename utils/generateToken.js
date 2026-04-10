const generateToken = (user) => {
  return jwt.sign(
    { 
      id: user._id, 
      email: user.email,  
      role: "user" 
    },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );
};