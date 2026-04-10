const Address = require("../../models/addressSchema");


const getAddAddress = async (req, res) => {
  try {
    res.render("add-address", { user: req.user });
  } catch (err) {
    console.error("getAddAddress error:", err);
    res.redirect("/pageNotFound");
  }
};


const postAddAddress = async (req, res) => {
  try {
    let {
      fullName, phone, street, city,
      state, pincode, country, landmark,
      type, isDefault
    } = req.body;

  
    if (!fullName || !phone || !street || !city || !state || !pincode) {
      return res.json({ success: false, message: "Please fill all required fields" });
    }

    if (!/^[6-9]\d{9}$/.test(phone.trim())) {
      return res.json({ success: false, message: "Invalid phone number" });
    }

    if (!/^\d{6}$/.test(pincode.trim())) {
      return res.json({ success: false, message: "Invalid pincode" });
    }

    const count = await Address.countDocuments({ userId: req.user.id });

    if (count >= 5) {
      return res.json({ success: false, message: "Max 5 addresses allowed" });
    }

    
    let makeDefault = false;

    if (isDefault === "true" || isDefault === true) {
      await Address.updateMany(
        { userId: req.user.id },
        { $set: { isDefault: false } }
      );
      makeDefault = true;
    }

   
    if (count === 0) {
      makeDefault = true;
    }

   
    await Address.create({
      userId: req.user.id,
      fullName: fullName.trim(),
      phone: phone.trim(),
      street: street.trim(),
      city: city.trim(),
      state: state.trim(),
      pincode: Number(pincode),
      country: country ? country.trim() : "India",
      landmark: landmark ? landmark.trim() : "",
      type: type || "Home",
      isDefault: makeDefault
    });

    return res.json({ success: true, message: "Address added successfully" });

  } catch (err) {
    console.error("postAddAddress error:", err);
    return res.json({ success: false, message: "Server error" });
  }
};


const getEditAddress = async (req, res) => {
  try {
    const address = await Address.findOne({
      _id: req.params.id,
      userId: req.user.id
    }).lean();

    if (!address) return res.redirect("/profile");

    res.render("edit-address", {
      user: req.user,
      address
    });

  } catch (err) {
    console.error("getEditAddress error:", err);
    res.redirect("/pageNotFound");
  }
};


//edit addres
   
const postEditAddress = async (req, res) => {
  try {
    let {
      fullName, phone, street, city,
      state, pincode, country, landmark,
      type, isDefault
    } = req.body;

   //adres validation
    if (!fullName || !phone || !street || !city || !state || !pincode) {
      return res.json({ success: false, message: "Please fill all required fields" });
    }

    if (!/^[6-9]\d{9}$/.test(phone.trim())) {
      return res.json({ success: false, message: "Invalid phone number" });
    }

    if (!/^\d{6}$/.test(pincode.trim())) {
      return res.json({ success: false, message: "Invalid pincode" });
    }

    const address = await Address.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!address) {
      return res.json({ success: false, message: "Address not found" });
    }

    //  Handle default
    if (isDefault === "true" || isDefault === true) {
      await Address.updateMany(
        { userId: req.user.id },
        { $set: { isDefault: false } }
      );
      address.isDefault = true;
    }

    // Update fields
    address.fullName = fullName.trim();
    address.phone    = phone.trim();
    address.street   = street.trim();
    address.city     = city.trim();
    address.state    = state.trim();
   address.pincode = Number(pincode);
    address.country  = country ? country.trim() : "India";
    address.landmark = landmark ? landmark.trim() : "";
    address.type     = type || "Home";

    await address.save();

    return res.json({ success: true, message: "Address updated successfully" });

  } catch (err) {
    console.error("postEditAddress error:", err);
    return res.json({ success: false, message: "Server error" });
  }
};

//delete address
const deleteAddress = async (req, res) => {
  try {
    const address = await Address.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!address) {
      return res.json({ success: false, message: "Address not found" });
    }

    const wasDefault = address.isDefault;

    await Address.findByIdAndDelete(req.params.id);

    if (wasDefault) {
        const next = await Address.findOne({ userId: req.user.id })
  .sort({ createdAt: 1 });
    
      if (next) {
        next.isDefault = true;
        await next.save();
      }
    }

    return res.json({ success: true });

  } catch (err) {
    console.error("deleteAddress error:", err);
    return res.json({ success: false, message: "Server error" });
  }
};


const setDefaultAddress = async (req, res) => {
  try {
    // Remove old default
    await Address.updateMany(
      { userId: req.user.id },
      { $set: { isDefault: false } }
    );

    // Set new default
    await Address.findOneAndUpdate(
  { _id: req.params.id, userId: req.user.id },
  { isDefault: true }
);

    return res.json({ success: true, message: "Default updated" });

  } catch (err) {
    console.error("setDefaultAddress error:", err);
    return res.json({ success: false, message: "Server error" });
  }
};

const getProfile = async (req, res) => {
  try {
    const addresses = await Address.find({ userId: req.user.id })
      .sort({ isDefault: -1, createdAt: -1 });

    res.render("profile", {
      user: req.user,
      addresses 
    });

  } catch (err) {
    console.error("getProfile error:", err);
    res.redirect("/pageNotFound");
  }
};



module.exports = {
  getAddAddress,
  postAddAddress,
  getEditAddress,
  postEditAddress,
  deleteAddress,
  setDefaultAddress,
  getProfile
};