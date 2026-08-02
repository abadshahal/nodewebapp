const httpStatus = require("../../constants/httpStatus");
const Address=require("../../models/addressSchema")
const Cart=require("../../models/cartSchema")
const Product=require("../../models/productSchema")
const Order=require("../../models/orderSchema")
const mongoose=require("mongoose")


const getCheckoutPage=async(req,res)=>{

  try {
const userId=req.user.id;
const addresses=await Address.find({userId}).sort({isDefault:-1,createdAt:-1})

const cart=await Cart.findOne({userId})

if(!cart||cart.items.length===0){
    return res.redirect("/cart")
}

const productIds=cart.items.map(item=>item.productId)
const productsData=await Product.find({_id:{$in:productIds}}).lean()


const cartItems=[]
let subTotal=0

for(const  item of cart.items ){

    const matchedProduct=productsData.find(
        (p)=>p._id.toString()===item.productId.toString()
    )
    if(!matchedProduct){
        continue;
    }

    const matchedVariant=matchedProduct.variants.find(
        (p)=>p._id.toString()===item.variantId.toString()
    )

    if(!matchedVariant){
        continue
    }
let itemTotal=matchedVariant.price*item.quantity
    subTotal+=itemTotal
cartItems.push({
    name:matchedProduct.name,
    image:matchedVariant.images[0],
    quantity:item.quantity,
    totalPrice:itemTotal,

})

  
}

const tax=subTotal*0.18
const total=subTotal+tax;

return res.render("user/checkout",{
user:req.user,
addresses,
cartItems,
subtotal:subTotal,
tax,
total,
})

  } catch (error) {
    console.error("getcheckoutpage error:",error)
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({success:false,message:"server error"})
    
  }
}

// const placeOrder=async(req,res)=>{

//     try {
//     const userId=req.user.id;
//  const {addressId,paymentMethod}=req.body;
//  if(!addressId||!paymentMethod){
// return res.status(httpStatus.BAD_REQUEST).json({success:false,message:"invalid request"})
//  }

//  const cart=await Cart.findOne({userId})
//  console.log(cart)

//  if(!cart||cart.items.length===0){
//     return res.status(httpStatus.BAD_REQUEST).json({success:false,message:"cart is empty"})
//  }

// const productIds= cart.items.map(item=>item.productId)
// console.log("productIds::",productIds)
// const productsData=await Product.find({_id:{$in:productIds}}).lean()
// console.log("productdata:",productsData)

// //spam protection for address
// const validAddress=await Address.findOne({_id:addressId,userId:userId})

// if(!validAddress){
//     return res.status(httpStatus.BAD_REQUEST).json({success:false,message:"Invalid address selected"})
// }

// const orderedItems=[]
// let subTotal=0;
  
// for(const item of cart.items){


//     const matchedProduct = productsData.find((p) => p._id.toString() === item.productId.toString());
//     console.log("matchedProduct:", matchedProduct);
    
//     if (!matchedProduct){
//         return res.status(httpStatus.BAD_REQUEST).json({success:false,message:"One of the item in your cart is no longer available"})
//     }

//     const matchedVariant=matchedProduct.variants.find((v)=>
//         v._id.toString()===item.variantId.toString())
//     console.log("matchedvariant:",matchedVariant)
//     if(!matchedVariant){
//         return res.status(httpStatus.BAD_REQUEST).json({success:false,message:`${matchedProduct.name}-selected variant is no longer available`})
//     }

//     if(item.quantity>matchedVariant.stock){
//         return res.status(httpStatus.BAD_REQUEST).json({success:false,message:"product is out stock"})
//     }
//     let itemTotal=matchedVariant.price*item.quantity;
//     subTotal += itemTotal;

//     orderedItems.push({
//         product:matchedProduct._id,
//         variant:matchedVariant._id,
//         quantity:item.quantity,
//         price:matchedVariant.price,
// })



// }


// const tax=subTotal*0.18
// const finalAmount=subTotal+tax;

// const order = await Order.create({
//   user: userId,
//   orderedItems,
//   totalPrice: subTotal,
//   finalAmount,
//   address: addressId,
//   paymentMethod,
//   status: "Pending",
// });

// return res.status(httpStatus.OK).json({
//   success: true,
//   orderId: order._id,
// });
 
        
//     }catch (error) {
//         console.error("placeOrder error:",error)
//         return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({success:false,message:"server error"})
        
//     }
// }

const placeOrder=async(req,res)=>{

    const session=await mongoose.startSession()
    session.startTransaction()
    try {
        const userId=req.user.id;
        const {addressId,paymentMethod}=req.body;
        if(!addressId||!paymentMethod){
            await session.abortTransaction()
            session.endSession()
            return res.status(httpStatus.BAD_REQUEST).json({success:"false",message:"invalid request"})
        }

         const cart=await Cart.findOne({userId}).session(session)
 console.log(cart)

 if(!cart||cart.items.length===0){
    await session.abortTransaction()
            session.endSession()
    return res.status(httpStatus.BAD_REQUEST).json({success:false,message:"cart is empty"})
 }

const productIds= cart.items.map(item=>item.productId)

console.log("productIds::",productIds)

const productsData=await Product.find({_id:{$in:productIds}}).lean().session(session)
console.log("productdata:",productsData)

//spam protection for address
const validAddress=await Address.findOne({_id:addressId,userId:userId}).session(session)

if(!validAddress){
    await session.abortTransaction()
            session.endSession()
    return res.status(httpStatus.BAD_REQUEST).json({success:false,message:"Invalid address selected"})
}

const orderedItems=[]
let subTotal=0;
  
for(const item of cart.items){


    const matchedProduct = productsData.find((p) => p._id.toString() === item.productId.toString());
    console.log("matchedProduct:", matchedProduct);
    
    if (!matchedProduct){
        await session.abortTransaction()
            session.endSession()
        return res.status(httpStatus.BAD_REQUEST).json({success:false,message:"One of the item in your cart is no longer available"})
    }

    const matchedVariant=matchedProduct.variants.find((v)=>
        v._id.toString()===item.variantId.toString())
    console.log("matchedvariant:",matchedVariant)
    if(!matchedVariant){
        await session.abortTransaction()
            session.endSession()
        return res.status(httpStatus.BAD_REQUEST).json({success:false,message:`${matchedProduct.name}-selected variant is no longer available`})
    }

    if(item.quantity>matchedVariant.stock){
        await session.abortTransaction()
            session.endSession()
        return res.status(httpStatus.BAD_REQUEST).json({success:false,message:"product is out stock"})
    }
    let itemTotal=matchedVariant.price*item.quantity;
    subTotal += itemTotal;

    orderedItems.push({
        product:matchedProduct._id,
        variant:matchedVariant._id,
        quantity:item.quantity,
        price:matchedVariant.price,
})



}


const tax=subTotal*0.18
const finalAmount=subTotal+tax;

const order = await Order.create([{
  user: userId,
  orderedItems,
  totalPrice: subTotal,
  finalAmount,
  address: addressId,
  paymentMethod,
  status: "Pending",
},],{session});






for(const item of orderedItems){
    const result=await Product.findOneAndUpdate(
        {
     _id:item.product,
     "variants._id":item.variant,
     "variants.stock":{$gte:item.quantity},

    },
    {$inc:{"variants.$.stock":-item.quantity},},{session}
)

if(!result){
    await session.abortTransaction()
    session.endSession()
    return res.status(httpStatus.BAD_REQUEST).json({success:false,message:"one more  item went out of stock while placing your order"})
}
}

await Cart.updateOne(
  { userId },
  { $set: { items: [] } },
  { session }
);

await session.commitTransaction()
session.endSession()

return res.status(httpStatus.OK).json({
    success:true,
    orderId:order[0]._id,
})

        
        
    } catch (error) {

        await session.abortTransaction()
        session.endSession()

        console.log("place order error:",error)
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({success:false,message:"server error"
        })
    }
}


const getOrderSuccess = async (req, res) => {
  try {
    const userId = req.user.id;
    const { orderId } = req.params;

    const order = await Order.findOne({ _id: orderId, user: userId });

    if (!order) {
      return res.status(httpStatus.BAD_REQUEST).json({ success: false, message: "Order not found" });
    }

    return res.render("user/order-success", {   user: req.user,order });

  } catch (error) {
    console.error("order success page error:", error);
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ success: false, message: "server error" });
  }
};

module.exports={
    getCheckoutPage,
    placeOrder,
    getOrderSuccess,
}
