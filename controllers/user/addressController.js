const Address = require("../../models/addressSchema");
const httpStatus = require("../../constants/httpStatus");

//  Get Add Address Page

const getAddAddress = async (req, res) => {
  try {
    res.render("user/add-address", { user: req.user });
  } catch (err) {
    console.error("getAddAddress error:", err);
    res.redirect("/pageNotFound");
  }
};

// Post Add Address

const postAddAddress = async (req, res) => {
  try {
    const {
      fullName, phone, street, city,
      state, pincode, country, landmark,
      type, isDefault
    } = req.body;

    if (!fullName || !phone || !street || !city || !state || !pincode) {
      return res.status(httpStatus.BAD_REQUEST).json({
        success: false,
        message: "Please fill all required fields",
      });
    }

    if (!/^[6-9]\d{9}$/.test(phone.trim())) {
      return res.status(httpStatus.BAD_REQUEST).json({
        success: false,
        message: "Invalid phone number",
      });
    }

    if (!/^\d{6}$/.test(pincode.trim())) {
      return res.status(httpStatus.BAD_REQUEST).json({
        success: false,
        message: "Invalid pincode",
      });
    }

    const count = await Address.countDocuments({ userId: req.user.id });

    if (count >= 5) {
      return res.status(httpStatus.BAD_REQUEST).json({
        success: false,
        message: "Maximum 5 addresses allowed",
      });
    }

    // First address is always default; otherwise respect the isDefault flag
    let makeDefault = count === 0;

    if (!makeDefault && (isDefault === "true" || isDefault === true)) {
      await Address.updateMany(
        { userId: req.user.id },
        { $set: { isDefault: false } }
      );
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
      isDefault: makeDefault,
    });

    return res.status(httpStatus.CREATED).json({
      success: true,
      message: "Address added successfully",
    });
  } catch (err) {
    console.error("postAddAddress error:", err);
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Server error",
    });
  }
};

// Get Edit Address Page 

const getEditAddress = async (req, res) => {
  try {
    const address = await Address.findOne({
      _id: req.params.id,
      userId: req.user.id,
    }).lean();

    if (!address) return res.redirect("/profile");

    res.render("user/edit-address", { user: req.user, address });
  } catch (error) {
    console.error("getEditAddress error:", error);
    res.redirect("/pageNotFound");
  }
};

//  Post Edit Address

const postEditAddress = async (req, res) => {
  try {
    const {
      fullName, phone, street, city,
      state, pincode, country, landmark,
      type, isDefault
    } = req.body;

    if (!fullName || !phone || !street || !city || !state || !pincode) {
      return res.status(httpStatus.BAD_REQUEST).json({
        success: false,
        message: "Please fill all required fields",
      });
    }

    if (!/^[6-9]\d{9}$/.test(phone.trim())) {
      return res.status(httpStatus.BAD_REQUEST).json({
        success: false,
        message: "Invalid phone number",
      });
    }

    if (!/^\d{6}$/.test(pincode.trim())) {
      return res.status(httpStatus.BAD_REQUEST).json({
        success: false,
        message: "Invalid pincode",
      });
    }

    const address = await Address.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!address) {
      return res.status(httpStatus.NOT_FOUND).json({
        success: false,
        message: "Address not found",
      });
    }

    //
    if (isDefault === "true" || isDefault === true) {
      await Address.updateMany(
        { userId: req.user.id },
        { $set: { isDefault: false } }
      );
      address.isDefault = true;
    }

    address.fullName = fullName.trim();
    address.phone    = phone.trim();
    address.street   = street.trim();
    address.city     = city.trim();
    address.state    = state.trim();
    address.pincode  = Number(pincode);
    address.country  = country ? country.trim() : "India";
    address.landmark = landmark ? landmark.trim() : "";
    address.type     = type || "Home";

    await address.save();

    return res.status(httpStatus.OK).json({
      success: true,
      message: "Address updated successfully",
    });
  } catch (err) {
    console.error("postEditAddress error:", err);
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Server error",
    });
  }
};

//  Delete Address 

const deleteAddress = async (req, res) => {
  try {
    const address = await Address.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!address) {
      return res.status(httpStatus.NOT_FOUND).json({
        success: false,
        message: "Address not found",
      });
    }

    const wasDefault = address.isDefault;

    await Address.findByIdAndDelete(req.params.id);

    // Promote the oldest remaining address to default if deleted one was default
    if (wasDefault) {
      const next = await Address.findOne({ userId: req.user.id }).sort({ createdAt: 1 });
      if (next) {
        next.isDefault = true;
        await next.save();
      }
    }

    return res.status(httpStatus.OK).json({ success: true });
  } catch (err) {
    console.error("deleteAddress error:", err);
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Server error",
    });
  }
};

//  Set Default Address 

const setDefaultAddress = async (req, res) => {
  try {
    await Address.updateMany(
      { userId: req.user.id },
      { $set: { isDefault: false } }
    );

    const updated = await Address.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { isDefault: true }
    );

    if (!updated) {
      return res.status(httpStatus.NOT_FOUND).json({
        success: false,
        message: "Address not found",
      });
    }

    return res.status(httpStatus.OK).json({
      success: true,
      message: "Default address updated",
    });
  } catch (err) {
    console.error("setDefaultAddress error:", err);
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Server error",
    });
  }
};


module.exports = {
  getAddAddress,
  postAddAddress,
  getEditAddress,
  postEditAddress,
  deleteAddress,
  setDefaultAddress,
};