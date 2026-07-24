const httpStatus = require("../../constants/httpStatus");
const Wishlist =require("../../models/wishlistSchema")
const Product=require("../../models/productSchema")
const Cart=require("../../models/cartSchema")


const getWishlistPage = async (req, res) => {
  try {
    const userId = req.user.id;

    const wishlistDoc = await Wishlist.findOne({ userId });

    let wishlist = [];

    if (wishlistDoc && wishlistDoc.products.length > 0) {
      const productIds = wishlistDoc.products.map(item => item.productId);
      const productsData = await Product.find({ _id: { $in: productIds } }).lean();

      wishlist = wishlistDoc.products.map(function(item) {
        const matchedProduct = productsData.find(function(p) {
          return p._id.toString() === item.productId.toString();
        });

        const matchedVariant = matchedProduct.variants.find(function(v) {
          return v._id.toString() === item.variantId.toString();
        });

        return {
          _id: item._id,
          product: {
            _id: matchedProduct._id,
            brand: matchedProduct.brand,
            price: matchedVariant.price,
            image: matchedVariant.images[0],
            rating: 5,
            variantId:matchedVariant._id
          }
        };
      });
    }

    return res.render("user/wishlist", {
      user: req.user,
      wishlist,
    });

  } catch (error) {
    console.error("getWishlistPage error:", error);
    return res.redirect("/pageNotFound");
  }
};


const toggleWishlist=async(req,res)=>{

    try {
        const userId=req.user.id;
   const{productId,variantId}=req.body;

   if(!productId){
    return res.status(httpStatus.BAD_REQUEST).json({success:false,message:"Product ID is required"});
   }
       
await Wishlist.updateOne({userId},{$setOnInsert:{userId,products:[]}},{upsert:true})

const existing=await Wishlist.findOne({userId,"products.productId":productId})

if(existing){
    await Wishlist.updateOne({userId},{$pull:{products:{productId}}})
    return res.status(httpStatus.OK).json({success:true,action:"removed"})
}else{


    await Wishlist.updateOne({userId,"products.productId":{$ne:productId}},{$push:{products:{productId,variantId,addedOn:new Date()}}})
    
    return res.status(httpStatus.OK).json({ success: true,action:"added" });
}

        
    } catch (error) {
        
          console.error("addToWishlist error:", error); 
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
              success: false,
              message: "Server error",
            });
        
    }
}

const removeFromWishlist=async(req,res)=>{

    try {
        
        const userId=req.user.id;
        const {id}=req.params;

        await Wishlist.updateOne({userId},{$pull:{products:{_id:id}}});
return res.status(httpStatus.OK).json({success:true})

    } catch (error) {
        
        console.error("removeFromWishlist error:",error)
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({success:false,message:"server error"})
    }
}

const emptyWishlist=async(req,res)=>{

    try {
        const userId=req.user.id;
        await Wishlist.updateOne({userId},{$set:{products:[]}})
        return res.status(httpStatus.OK).json({success:true,message:"empty all successfully"})
        
    } catch (error) {
        console.error("emptywishlist error:",error)
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({success:false,message:"server error"})
    }
}

const moveAllToCart=async(req,res)=>{
    try {
        let userId=req.user.id;
        const wishlistDoc=await Wishlist.findOne({userId})

        if(!wishlistDoc||wishlistDoc.products.length===0){
            return res.status(httpStatus.BAD_REQUEST).json({success:false,message:"your wishlist is empty"});
        }

        let cart=await Cart.findOne({userId});

        if(!cart)cart=new Cart({userId,items:[]})
         let  movedCount=0;
        let  skippedCount=0
        const movedProductIds=[];

      for(const item of wishlistDoc.products){
        const product=await Product.findById(item.productId).lean()

        if(!product){
          skippedCount++;
          continue;
        }
        const variant=product.variants.find(v=>v._id.toString()===item.variantId.toString())

        if(!variant||variant.stock===0){
          skippedCount++;
          continue;
        }
        const alreadyInCart=cart.items.some(
          i=>i.productId.toString()===item.productId.toString()
          && i.variantId.toString()===item.variantId.toString())
  
  if(!alreadyInCart){
    cart.items.push({
      productId:item.productId,
      variantId:item.variantId,
      quantity:1,
      price:variant.price,
      totalPrice:variant.price
  
    })
  }
  movedProductIds.push(item.productId);
  movedCount++;

      }  

      await cart.save();

      await Wishlist.updateOne({userId},{$pull:{products:{productId:{$in:movedProductIds}}}});

       return res.status(httpStatus.OK).json({
      success: true,
      message: `${movedCount} item(s) moved to cart${skippedCount > 0 ? `, ${skippedCount} skipped (out of stock)` : ""}`,
    });


        
    } catch (error) {
      console.error("moveAllToCart error:",error)
      return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({success:false,message:"server error"})
        
    }
}

module.exports={
    toggleWishlist,
    getWishlistPage,
    removeFromWishlist,
    emptyWishlist,
    moveAllToCart,
}