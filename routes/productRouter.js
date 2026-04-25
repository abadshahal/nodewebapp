

const express= require('express');
const router= express.Router();
const multer= require('multer');
const productController= require('../controllers/admin/productController');
const { verifyAdmin } = require('../middlewares/auth');
const noCache = require('../middlewares/noCache');

//multer setup
const upload = multer({
  storage: multer.memoryStorage(),
  limits : { fileSize: 10 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    file.mimetype.startsWith('image/')
      ? cb(null, true)
      : cb(new Error('Only image files are allowed.'));
  },
});


router.use(noCache);
router.use(verifyAdmin);

// Routes
router.get   ('/',           productController.getProducts);
router.get   ('/add',        productController.getAddProduct);
router.post  ('/add',        upload.any(), productController.postAddProduct);
router.get   ('/edit/:id',   productController.getEditProduct);
router.post  ('/edit/:id',   upload.any(), productController.postEditProduct);
router.patch ('/toggle/:id', productController.toggleProduct);
router.delete('/delete/:id', productController.deleteProduct);

// multer eror handeler
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError || err.message === 'Only image files are allowed.') {
    return res.status(400).json({ success: false, message: err.message });
  }
  next(err);
});

module.exports = router;