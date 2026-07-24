const Product  = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const Wishlist = require("../../models/wishlistSchema");

const ITEMS_PER_PAGE = 9;

const loadShopPage = async (req, res) => {
  try {
    const {
      search = "",
      category = "",
      brand = "",
      minPrice = "",
      maxPrice = "",
      sort = "newest",
      page = "1",
    } = req.query;

    const currentPage = Math.max(1, parseInt(page) || 1);

    //  only listed categories
    const listedCategoryIds = await Category.find({ isListed: true }).distinct("_id");

    //  base filter 
    const filter = {
      isListed: true,
      category: { $in: listedCategoryIds },
      // totalStock: { $gt: 0 },  // only show products that have stock
    };

    // search 
    if (search.trim()) {
      filter.$or = [
        { name:  { $regex: search.trim(), $options: "i" } },
        { brand: { $regex: search.trim(), $options: "i" } },
      ];
    }

    // category filter
    if (category) {
      const mongoose = require("mongoose");
      if (mongoose.Types.ObjectId.isValid(category)) {
        filter.category = category;   // overrides the $in — specific category
      }
    }

    // brand filter
    if (brand.trim()) {
      filter.brand = { $regex: `^${brand.trim()}$`, $options: "i" };
    }

    //  price range 
    if (minPrice !== "" || maxPrice !== "") {
      filter.basePrice = {};
      if (minPrice !== "") filter.basePrice.$gte = parseFloat(minPrice);
      if (maxPrice !== "") filter.basePrice.$lte = parseFloat(maxPrice);
    }

    // sort
    const sortMap = {
      newest:      { createdAt: -1 },
      oldest:      { createdAt:  1 },
      "price-asc": { basePrice:  1 },
      "price-desc":{ basePrice: -1 },
      "a-z":       { name:       1 },
      "z-a":       { name:      -1 },
    };
    const sortOption = sortMap[sort] || sortMap.newest;

    // paginate
    const totalProducts = await Product.countDocuments(filter);
    const totalPages    = Math.ceil(totalProducts / ITEMS_PER_PAGE);
    const skip          = (currentPage - 1) * ITEMS_PER_PAGE;

    const products = await Product.find(filter)
      .populate("category", "name")
      .sort(sortOption)
      .skip(skip)
      .limit(ITEMS_PER_PAGE)
      .lean();

      let wishlistedIds=[];

      if(req.user){
        const wishlistDoc=await Wishlist.findOne({userId:req.user.id});

        if(wishlistDoc){
          wishlistedIds=wishlistDoc.products.map(item=>item.productId.toString())
        }
      }


    // sidebar data
    const categories = await Category.find({ isListed: true }).lean();
    const brands = await Product.distinct("brand", {
      isListed: true,
      category: { $in: listedCategoryIds },
      brand: { $ne: "" },
    });

    res.render("user/shop", {
      user: req.user || null,
      products,
      categories,
      brands,
      totalProducts,
      totalPages,
      currentPage,
      wishlistedIds,
     
      filters: { search, category, brand, minPrice, maxPrice, sort },
    });

  } catch (error) {
    console.error("Shop page error:", error);
    res.redirect("/pageNotFound");
  }
};

const loadProductDetailPage = async (req, res) => {
  try {
    const { id } = req.params;
    const user   = req.user || null;

    // Validate ObjectId format 
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.redirect("/shop");
    }

    //  Fetch product + populate category 
    const product = await Product.findById(id).populate("category").lean();

    if (!product) return res.redirect("/shop");
    if (!product.isListed) return res.redirect("/shop");
    if (!product.category?.isListed) return res.redirect("/shop");
    if (!product.variants?.length)return res.redirect("/shop");

    
   
    let selectedVariantIndex = 0;
    if (req.query.variant) {
      const idx = product.variants.findIndex(
        (v) => v._id.toString() === req.query.variant
      );
      if (idx !== -1) selectedVariantIndex = idx;
    }
    const selectedVariant = product.variants[selectedVariantIndex];

    //  Related products
    //    Same category, listed, has stock, exclude current, limit 4
    const relatedProducts = await Product.find({
      category  : product.category._id,
      isListed  : true,
      totalStock: { $gt: 0 },
      _id       : { $ne: product._id },
    })
      .limit(4)
      .lean();

       let isWishlisted = false;

    if (user) {
      const existing = await Wishlist.findOne({ userId: user.id, "products.productId": id });
      isWishlisted = !!existing;
    }
   
    return res.render("user/product-detail", {
      user,
      product,
      selectedVariantIndex,
      selectedVariant,
      relatedProducts,
      filters: {},
      isWishlisted   // kept for consistency with other user pages
    });

  } catch (err) {
    console.error("loadProductDetailPage error:", err);
    return res.redirect("/shop");
  }
};

module.exports = { loadProductDetailPage, loadShopPage };