const Category = require("../../models/categorySchema");
const Product  = require("../../models/productSchema");

const LIMIT = 8;

//  GET /admin/categories
const getCategoryList = async (req, res) => {
  try {
    const search      = req.query.search?.trim() || '';
    const sort        = req.query.sort  || 'newest';
    const currentPage = Math.max(1, parseInt(req.query.page) || 1);

    const filter = search
      ? { name: { $regex: search, $options: 'i' } }
      : {};

    const sortMap = {
      newest : { createdAt: -1 },
      oldest : { createdAt:  1 },
      name   : { name: 1 },
    };
    const sortQuery = sortMap[sort] || sortMap.newest;

    const totalCategories = await Category.countDocuments(filter);
    const totalPages      = Math.ceil(totalCategories / LIMIT);

    const categories = await Category.find(filter)
      .sort(sortQuery)
      .skip((currentPage - 1) * LIMIT)
      .limit(LIMIT)
      .lean();

    // FIX: aggregate total stock per category from products
    const stockAgg = await Product.aggregate([
      {
        $group: {
          _id  : '$category',
          stock: { $sum: '$totalStock' },
        },
      },
    ]);

    // Build a quick lookup map: categoryId (string) → stock
    const stockMap = {};
    for (const row of stockAgg) {
      if (row._id) stockMap[row._id.toString()] = row.stock;
    }

    // Attach stock to each category
    for (const cat of categories) {
      cat.stock = stockMap[cat._id.toString()] || 0;
    }

    res.render('admin/category-list', {
      categories,
      search,
      sort,
      currentPage,
      totalPages,
      totalCategories,
      limit    : LIMIT,
      adminName: req.admin?.name || 'Admin',
    });

  } catch (err) {
    console.error('getCategoryList error:', err);
    res.status(500).send('Server error');
  }
};

//  GET /admin/categories/add
const getAddCategory = (req, res) => {
  res.render('admin/category-add', {
    admin    : { name: req.admin?.name || 'Admin' },
    formData : {},
    errors   : {},
    error    : null,
  });
};

//  POST /admin/categories/add
const postAddCategory = async (req, res) => {
  const { name, description, offerValue } = req.body;

  const trimmedName = name?.trim();
  const trimmedDesc = description?.trim() || '';
  const offer       = offerValue !== '' && offerValue !== undefined
    ? Number(offerValue)
    : 0;

  const errors = {};

  if (!trimmedName) {
    errors.name = 'Category name is required.';
  } else if (trimmedName.length < 2) {
    errors.name = 'Category name must be at least 2 characters.';
  } else if (trimmedName.length > 50) {
    errors.name = 'Category name must not exceed 50 characters.';
  }

  if (isNaN(offer) || offer < 0 || offer > 100) {
    errors.offerValue = 'Offer must be a number between 0 and 100.';
  }

  if (Object.keys(errors).length > 0) {
    return res.render('admin/category-add', {
      admin    : { name: req.admin?.name || 'Admin' },
      errors,
      formData : req.body,
      error    : null,
    });
  }

  try {
    const exists = await Category.findOne({
      name: { $regex: `^${trimmedName}$`, $options: 'i' },
    });

    if (exists) {
      return res.render('admin/category-add', {
        admin    : { name: req.admin?.name || 'Admin' },
        error    : `Category "${trimmedName}" already exists.`,
        formData : req.body,
        errors   : {},
      });
    }

    await Category.create({
      name        : trimmedName,
      description : trimmedDesc,
      offerValue  : offer,
      offerType   : 'percentage',
      isListed    : true,
    });

    res.redirect('/admin/categories');

  } catch (err) {
    console.error('postAddCategory error:', err);
    res.render('admin/category-add', {
      admin    : { name: req.admin?.name || 'Admin' },
      error    : 'Something went wrong. Please try again.',
      formData : req.body,
      errors   : {},
    });
  }
};

//  GET /admin/categories/edit/:id
const getEditCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id).lean();

    if (!category) {
      return res.status(404).send('Category not found');
    }

    res.render('admin/category-edit', {
      category,
      admin  : { name: req.admin?.name || 'Admin' },
      errors : {},
      error  : null,
    });

  } catch (err) {
    console.error('getEditCategory error:', err);
    res.status(500).send('Server error');
  }
};

//  POST /admin/categories/edit/:id
const postEditCategory = async (req, res) => {
  const { id }                            = req.params;
  const { name, description, offerValue } = req.body;

  const trimmedName = name?.trim();
  const trimmedDesc = description?.trim() || '';
  const offer       = offerValue !== '' && offerValue !== undefined
    ? Number(offerValue)
    : 0;

  const errors = {};

  if (!trimmedName) {
    errors.name = 'Category name is required.';
  } else if (trimmedName.length < 2) {
    errors.name = 'Category name must be at least 2 characters.';
  } else if (trimmedName.length > 50) {
    errors.name = 'Category name must not exceed 50 characters.';
  }

  if (isNaN(offer) || offer < 0 || offer > 100) {
    errors.offerValue = 'Offer must be a number between 0 and 100.';
  }

  if (Object.keys(errors).length > 0) {
    const category = await Category.findById(id).lean();
    return res.render('admin/category-edit', {
      admin    : { name: req.admin?.name || 'Admin' },
      category : { ...category, ...req.body, _id: id },
      errors,
      error    : null,
    });
  }

  try {
    const exists = await Category.findOne({
      _id  : { $ne: id },
      name : { $regex: `^${trimmedName}$`, $options: 'i' },
    });

    if (exists) {
      const category = await Category.findById(id).lean();
      return res.render('admin/category-edit', {
        admin    : { name: req.admin?.name || 'Admin' },
        category : { ...category, ...req.body, _id: id },
        error    : `Category "${trimmedName}" already exists.`,
        errors   : {},
      });
    }

    await Category.findByIdAndUpdate(id, {
      name        : trimmedName,
      description : trimmedDesc,
      offerValue  : offer,
      offerType   : 'percentage',
    });

    res.redirect('/admin/categories');

  } catch (err) {
    console.error('postEditCategory error:', err);
    res.status(500).send('Server error');
  }
};

//  PATCH /admin/categories/toggle/:id
const toggleCategory = async (req, res) => {
  try {
    const { id }       = req.params;
    const { isListed } = req.body;

    if (typeof isListed !== 'boolean') {
      return res.status(400).json({ success: false, message: 'Invalid payload.' });
    }

    const category = await Category.findByIdAndUpdate(
      id,
      { isListed },
      { new: true }
    );

    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found.' });
    }

    res.json({ success: true, isListed: category.isListed });

  } catch (err) {
    console.error('toggleCategory error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

//  DELETE /admin/categories/delete/:id
const deleteCategory = async (req, res) => {
  try {
    const category = await Category.findByIdAndDelete(req.params.id);

    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found.' });
    }

    res.json({ success: true, message: 'Category deleted successfully.' });

  } catch (err) {
    console.error('deleteCategory error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

module.exports = {
  getCategoryList,
  getAddCategory,
  postAddCategory,
  getEditCategory,
  postEditCategory,
  toggleCategory,
  deleteCategory,
};