const express = require('express');
const router  = express.Router();
const categoryController=require("../controllers/admin/categoryController")

const {verifyAdmin} = require("../middlewares/auth"); 

//  Category list 
router.get('/',verifyAdmin, categoryController.getCategoryList);

// Add category
router.get('/add',verifyAdmin,categoryController.getAddCategory);
router.post('/add',verifyAdmin,categoryController.postAddCategory);

// Edit category
router.get('/edit/:id',verifyAdmin,categoryController.getEditCategory);
router.post('/edit/:id',verifyAdmin,categoryController.postEditCategory);

// list or unlist 
router.patch('/toggle/:id',verifyAdmin,categoryController.toggleCategory);


router.delete('/delete/:id',verifyAdmin,categoryController.deleteCategory);

module.exports = router;