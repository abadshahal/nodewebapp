const Product    = require('../../models/productSchema');
const Category   = require('../../models/categorySchema');
const cloudinary = require('../../config/cloudinary');

// ─── Helpers ───────────────────────────────────────────────────────────────

async function uploadToCloudinary(buffer, folder = 'velorian/products') {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'image' },
      (err, result) => (err ? reject(err) : resolve(result.secure_url))
    );
    stream.end(buffer);
  });
}

async function deleteFromCloudinary(url) {
  try {
    if (!url || !url.includes('cloudinary')) return;
    const parts     = url.split('/');
    const uploadIdx = parts.indexOf('upload');
    const start     = /^v\d+$/.test(parts[uploadIdx + 1]) ? uploadIdx + 2 : uploadIdx + 1;
    const publicId  = parts.slice(start).join('/').replace(/\.[^.]+$/, '');
    await cloudinary.uploader.destroy(publicId);
  } catch (_) {}
}

// ── GET /admin/products ────────────────────────────────────────────────────
const getProducts = async (req, res) => {
  try {
    const { search = '', category = '', sort = 'newest', page = 1 } = req.query;

    const limit       = 10;
    const currentPage = Math.max(1, parseInt(page) || 1);
    const skip        = (currentPage - 1) * limit;

    const query = {};
    if (search.trim()) query.name     = { $regex: search.trim(), $options: 'i' };
    if (category)      query.category = category;

    const sortMap = {
      newest    : { createdAt: -1 },
      oldest    : { createdAt:  1 },
      name      : { name: 1 },
      price_asc : { basePrice: 1 },
      price_desc: { basePrice: -1 },
    };

    const [products, totalProducts, categories] = await Promise.all([
      Product.find(query)
        .populate('category', 'name')
        .sort(sortMap[sort] || sortMap.newest)
        .skip(skip)
        .limit(limit)
        .lean(),
      Product.countDocuments(query),
      Category.find({ isActive: { $ne: false } }).select('name').lean(),
    ]);

    return res.render('admin/product-list', {
      products,
      categories,
      totalProducts,
      totalPages      : Math.ceil(totalProducts / limit),
      currentPage,
      limit,
      search,
      sort,
      selectedCategory : category,
      adminName        : req.admin?.name || req.admin?.email || 'Admin',
    });
  } catch (err) {
    console.error('[getProducts]', err);
    return res.status(500).send('Server error loading products.');
  }
};

// ── PATCH /admin/products/toggle/:id ──────────────────────────────────────
const toggleProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { isListed: Boolean(req.body.isListed) },
      { new: true }
    );
    if (!product) return res.status(404).json({ success: false, message: 'Product not found.' });
    return res.json({ success: true, isListed: product.isListed });
  } catch (err) {
    console.error('[toggleProduct]', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── DELETE /admin/products/delete/:id ─────────────────────────────────────
const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found.' });

    for (const variant of product.variants || []) {
      await Promise.all((variant.images || []).map(deleteFromCloudinary));
    }

    await product.deleteOne();
    return res.json({ success: true });
  } catch (err) {
    console.error('[deleteProduct]', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── GET /admin/products/add ───────────────────────────────────────────────
const getAddProduct = async (req, res) => {
  try {
    const categories = await Category.find({ isActive: { $ne: false } }).select('name').lean();
    return res.render('admin/product-add', {
      categories,
      admin    : req.admin || { name: 'Admin' },
      error    : null,
      errors   : {},
      formData : {},
    });
  } catch (err) {
    console.error('[getAddProduct]', err);
    return res.status(500).send('Server error.');
  }
};

// ── POST /admin/products/add ──────────────────────────────────────────────
const postAddProduct = async (req, res) => {
  const categories = await Category.find({ isActive: { $ne: false } }).select('name').lean();
  const formData   = req.body;
  const errors     = {};

  if (!formData.name?.trim())        errors.name        = 'Product name is required.';
  if (!formData.description?.trim()) errors.description = 'Description is required.';
  if (!formData.category)            errors.category    = 'Category is required.';

  if (Object.keys(errors).length) {
    return res.render('admin/product-add', {
      categories,
      admin    : req.admin || { name: 'Admin' },
      error    : 'Please fix the errors below.',
      errors,
      formData,
    });
  }

  try {
    const rawVariants      = formData.variants         || {};
    const variantImageKeys = formData.variantImageKeys || {};

    // multer file map
    const fileMap = {};
    for (const f of (req.files || [])) fileMap[f.fieldname] = f;

    const variantIndexes = Object.keys(rawVariants).sort((a, b) => +a - +b);

    if (!variantIndexes.length) {
      return res.render('admin/product-add', {
        categories,
        admin  : req.admin || { name: 'Admin' },
        error  : 'At least one variant is required.',
        errors : {},
        formData,
      });
    }

    const builtVariants = [];
    let   basePrice     = Infinity;

    for (let i = 0; i < variantIndexes.length; i++) {
      const vi    = variantIndexes[i];                              // e.g. "0", "1"
      const vData = rawVariants[vi];

      // FIX: use vi (string key) to look up variantImageKeys, not i (number index)
      const imgKeys = [].concat(variantImageKeys[vi] || []);

      const imageUrls = [];
      for (const key of imgKeys) {
        const file = fileMap[`images[${key}]`];
        if (file) imageUrls.push(await uploadToCloudinary(file.buffer));
      }

      const price = parseFloat(vData.price) || 0;
      if (price < basePrice) basePrice = price;

      builtVariants.push({
        color        : vData.color?.trim()          || '',
        strapMaterial: vData.strapMaterial          || '',
        price,
        stock        : parseInt(vData.stock)        || 0,
        offerValue   : parseFloat(vData.offerValue) || 0,
        images       : imageUrls,
      });
    }

    await new Product({
      name          : formData.name.trim(),
      description   : formData.description.trim(),
      category      : formData.category,
      brand         : formData.brand?.trim()        || '',
      basePrice     : basePrice === Infinity ? 0 : basePrice,
      totalStock    : builtVariants.reduce((s, v) => s + v.stock, 0),
      isListed      : true,
      specifications: {
        warranty       : formData.warranty?.trim()        || '',
        waterResistance: formData.waterResistance?.trim() || '',
      },
      variants: builtVariants,
    }).save();

    return res.redirect('/admin/products');

  } catch (err) {
    console.error('[postAddProduct]', err);
    return res.render('admin/product-add', {
      categories,
      admin  : req.admin || { name: 'Admin' },
      error  : 'Something went wrong. Please try again.',
      errors : {},
      formData,
    });
  }
};

// ── GET /admin/products/edit/:id ──────────────────────────────────────────
const getEditProduct = async (req, res) => {
  try {
    const [product, categories] = await Promise.all([
      Product.findById(req.params.id).lean(),
      Category.find({ isActive: { $ne: false } }).select('name').lean(),
    ]);
    if (!product) return res.redirect('/admin/products');

    return res.render('admin/product-edit', {
      product,
      categories,
      admin  : req.admin || { name: 'Admin' },
      error  : null,
      success: null,
    });
  } catch (err) {
    console.error('[getEditProduct]', err);
    return res.redirect('/admin/products');
  }
};

// ── POST /admin/products/edit/:id ─────────────────────────────────────────
const postEditProduct = async (req, res) => {
  let categories = [];
  try {
    categories = await Category.find({ isActive: { $ne: false } }).select('name').lean();
  } catch (_) {}

  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.redirect('/admin/products');

    const formData = req.body;
    const fileMap  = {};
    for (const f of (req.files || [])) fileMap[f.fieldname] = f;

    // Top-level fields
    if (formData.name?.trim())        product.name        = formData.name.trim();
    if (formData.description?.trim()) product.description = formData.description.trim();
    if (formData.category)            product.category    = formData.category;
    product.brand          = formData.brand?.trim() || '';
    product.specifications = {
      warranty       : formData.warranty?.trim()        || '',
      waterResistance: formData.waterResistance?.trim() || '',
    };

    // Variants
    const rawVariants      = formData.variants         || {};
    const variantImageKeys = formData.variantImageKeys || {};
    const variantIndexes   = Object.keys(rawVariants).sort((a, b) => +a - +b);

    const builtVariants = [];
    let   basePrice     = Infinity;

    for (let i = 0; i < variantIndexes.length; i++) {
      const vi          = variantIndexes[i];                        // e.g. "0", "1"
      const vData       = rawVariants[vi];

      // FIX: use vi (string key) to look up variantImageKeys, not i (number index)
      const newKeys     = [].concat(variantImageKeys[vi] || []);
      const removedImgs = [].concat(vData.removedImages || []);

      // Delete removed images from Cloudinary
      await Promise.all(removedImgs.map(deleteFromCloudinary));

      // Upload new images
      const newUploadedUrls = {};
      for (const key of newKeys) {
        const file = fileMap[`images[${key}]`];
        if (file) newUploadedUrls[key] = await uploadToCloudinary(file.buffer);
      }

      // Rebuild slots 0-3: new upload wins, else keep existing if not removed
      const existingVariant = product.variants.find(
        v => v._id?.toString() === vData._id?.toString()
      );
      const imageUrls = [];
      for (let si = 0; si < 4; si++) {
        const blobKey = `v${vi}_s${si}`;
        if (newUploadedUrls[blobKey]) {
          imageUrls.push(newUploadedUrls[blobKey]);
        } else {
          const existingUrl = existingVariant?.images?.[si];
          if (existingUrl && !removedImgs.includes(existingUrl)) {
            imageUrls.push(existingUrl);
          }
        }
      }

      const price = parseFloat(vData.price) || 0;
      if (price < basePrice) basePrice = price;

      const builtVariant = {
        color        : vData.color?.trim()          || '',
        strapMaterial: vData.strapMaterial          || '',
        price,
        stock        : parseInt(vData.stock)        || 0,
        offerValue   : parseFloat(vData.offerValue) || 0,
        images       : imageUrls.filter(Boolean),
      };
      if (vData._id) builtVariant._id = vData._id;
      builtVariants.push(builtVariant);
    }

    product.variants   = builtVariants;
    product.basePrice  = basePrice === Infinity ? 0 : basePrice;
    product.totalStock = builtVariants.reduce((s, v) => s + v.stock, 0);

    await product.save();
    return res.redirect('/admin/products');

  } catch (err) {
    console.error('[postEditProduct]', err);
    return res.render('admin/product-edit', {
      product   : { _id: req.params.id, ...req.body },
      categories,
      admin     : req.admin || { name: 'Admin' },
      error     : 'Something went wrong. Please try again.',
      success   : null,
    });
  }
};

module.exports = {
  getProducts,
  toggleProduct,
  deleteProduct,
  getAddProduct,
  postAddProduct,
  getEditProduct,
  postEditProduct,
};