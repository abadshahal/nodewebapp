const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("../models/userSchema");
require("dotenv").config();

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/callback"
},
async (accessToken, refreshToken, profile, done) => {
    try {

       
        let user = await User.findOne({ googleId: profile.id });

        if (user) {
            return done(null, user);
        }

        //  Check if email already exists (manual signup case)
        const email = profile.emails?.[0]?.value;

        user = await User.findOne({ email });

        if (user) {
          
            user.googleId = profile.id;
            user.isGoogleUser = true;
            await user.save();

            return done(null, user);
        }

      
        const firstname = profile.name?.givenName || "User";
        const lastname = profile.name?.familyName || "";

      
        const profileImage = profile.photos?.[0]?.value || "";

      
        user = new User({
            firstname,
            lastname,
            email,
            googleId: profile.id,
            profileImage,
            isGoogleUser: true,
            isVerified: true // Google users are trusted
        });

        await user.save();

        return done(null, user);

    } catch (error) {
        return done(error, null);
    }
}));





module.exports = passport;