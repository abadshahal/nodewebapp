const User = require("../models/userSchema");

const findOrCreateGoogleUser = async (profile) => {
 
  let user = await User.findOne({ googleId: profile.id });
  if (user) return user;

  
  const email = profile.emails?.[0]?.value;
  user = await User.findOne({ email });

  if (user) {
    user.googleId = profile.id;
    user.isGoogleUser = true;
    await user.save();
    return user;
  }

  // Brand new user — create account
  user = await User.create({
    firstname: profile.name?.givenName || "User",
    lastname: profile.name?.familyName || "",
    email,
    googleId: profile.id,
    profileImage: profile.photos?.[0]?.value || "",
    isGoogleUser: true,
    isVerified: true,
  });

  return user;
};

module.exports = { findOrCreateGoogleUser };