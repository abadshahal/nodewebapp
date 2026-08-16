const mongoose= require("mongoose");
const httpStatus=require("../../constants/httpStatus")
const Order=require("../../models/orderSchema");
const Product = require("../../models/productSchema");
const {generateInvoicePdf}=require("../../services/invoiceService");
const { request } = require("express");


const getOrderDetail=async(req,res)=>{

    try {
        const userId=req.user.id;
        const {orderId}=req.params;

        const order=await Order.findOne({_id:orderId,user:userId}).populate("address").populate("orderedItems.product")
        if(!order){
            return res.status(httpStatus.BAD_REQUEST).json({success:false,message:"order not found"})
        }


        for(const item of order.orderedItems){

           item.matchedVariant=item.product.variants.find((v)=>v._id.toString()===item.variant.toString())
        }

       

        return res.render("user/order-details",{user:req.user,order})
        
    } catch (error) {
        console.log("get order Details error:",error)
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({success:false,message:"server error"
        })
        
    }
}

const getMyOrders = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, search = "" } = req.query;
    const limit = 5;

    const currentPage = Math.max(1, parseInt(page) || 1);
    const skip = (currentPage - 1) * limit;

    const filter = { user: userId };

    if (search.trim()) {
      const matchingProducts = await Product.find({
        name: { $regex: search.trim(), $options: 'i' }
      }).select('_id');

      const matchingProductIds = matchingProducts.map(p => p._id);

      filter.$or = [
        { orderId: { $regex: search.trim(), $options: 'i' } },
        { "orderedItems.product": { $in: matchingProductIds } },
      ];
    }

    const totalOrders = await Order.countDocuments(filter);
    const totalpages = Math.ceil(totalOrders / limit);

    const orders = await Order.find(filter)
      .populate("orderedItems.product")
      .sort({ createdOn: -1 })
      .skip(skip)
      .limit(limit);

    return res.render("user/orders", { user: req.user, orders, currentPage, totalpages, search });

  } catch (error) {
    console.log("getMyOrders error:", error);
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ success: false, message: "server error" });
  }
};

const cancelOrder=async(req,res)=>{
const session=await mongoose.startSession()

session.startTransaction()

try {
    const userId=req.user.id;
    const {orderId}=req.params;
    const {reason}=req.body;

const updatedOrder=await Order.findOneAndUpdate({
    _id:orderId,
    user:userId,
    status:{$in:["Pending","Processing"]}
},{$set:{status:"Cancelled",cancelReason:reason||null}},{session,new:true})

if(!updatedOrder){
    await session.abortTransaction()
    session.endSession()
    return res.status(httpStatus.BAD_REQUEST).json({success:false,message:"order cannot be cancelled it may have already shipped or been proccessed"})
}for (const item of updatedOrder.orderedItems) {
  await Product.findOneAndUpdate(
    {
      _id: item.product,
      "variants._id": item.variant,
    },
    {
      $inc: { "variants.$.stock": item.quantity,totalStock:item.quantity },
    },
    { session }
  );


  
}
await session.commitTransaction();
session.endSession();

return res.status(httpStatus.OK).json({ success: true, message: "Order cancelled successfully" });
   
    
} catch (error) {
   console.log("cancel Order error:",error) 
   await session.abortTransaction()
   session.endSession()

   return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({success:false,message:"server error"})
}
    
}

const cancelOrderItem = async (req, res) => {
    const session = await mongoose.startSession()
    session.startTransaction()
    try {
        const userId = req.user.id;
        const { orderId } = req.params;
        const { itemId } = req.params
        const { reason } = req.body;

        const updatedOrder = await Order.findOneAndUpdate(
            {
                _id: orderId,
                user: userId,
                status: { $in: ["Pending", "Processing"] },
                "orderedItems._id": itemId,
            }, {
                $set: {
                    "orderedItems.$[item].isCancelled": true,
                    "orderedItems.$[item].cancelReason": reason || null
                },
            }, { session, new: true, arrayFilters: [{ "item._id": itemId }], }
        )

        if (!updatedOrder) {
            await session.abortTransaction();
            session.endSession();
            return res.status(httpStatus.BAD_REQUEST).json({
                success: false,
                message: "Item cannot be cancelled - order may have already shipped, or item not found",
            });
        }

        const cancelledItem = updatedOrder.orderedItems.find((item) => item._id.toString() === itemId.toString());

        //  Restore stock for this one item
        await Product.findOneAndUpdate(
            {
                _id: cancelledItem.product,
                "variants._id": cancelledItem.variant,
            },
            {
                $inc: {
                    "variants.$.stock": cancelledItem.quantity,
                    totalStock: cancelledItem.quantity,
                },
            },
            { session }
        );

       
        const itemCost = cancelledItem.price * cancelledItem.quantity;
        const newTotalPrice = updatedOrder.totalPrice - itemCost;
        const newFinalAmount = newTotalPrice * 1.18;

        await Order.findByIdAndUpdate(
            orderId,
            {
                $set: {
                    totalPrice: newTotalPrice,
                    finalAmount: newFinalAmount,
                },
            },
            { session }
        );

        
        await session.commitTransaction();
        session.endSession();

        return res.status(httpStatus.OK).json({
            success: true,
            message: "Item cancelled successfully",
        });

    } catch (error) {
        console.log("cancel item error", error)
        await session.abortTransaction()
        session.endSession()
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ success: false, message: "server error" })
    }
}

const returnOrder = async (req, res) => {
  try {
    const userId = req.user.id;
    const { orderId } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(httpStatus.BAD_REQUEST).json({ success: false, message: "reason required" });
    }

    const updatedOrder = await Order.findOneAndUpdate(
      {
        _id: orderId,
        user: userId,
        status: "Delivered",
      },
      {
        $set: {
          status: "Return Request",
          returnReason: reason,
        },
      },
      { new: true }
    );

    if (!updatedOrder) {
      return res.status(httpStatus.BAD_REQUEST).json({
        success: false,
        message: "Order cannot be returned — it may not be delivered yet, or already has a return request",
      });
    }

    return res.status(httpStatus.OK).json({
      success: true,
      message: "Return request submitted successfully",
    });

  } catch (error) {
    console.log("returnOrder error:", error);
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ success: false, message: "server error" });
  }
};

const downloadInvoice=async(req,res)=>{
  try {
    const userId=req.user.id;
    const {orderId}=req.params;

const order = await Order.findOne({ _id: orderId, user: userId })
  .populate("address")
  .populate("orderedItems.product");

if (!order) {
  return res.status(httpStatus.BAD_REQUEST).json({ success: false, message: "Order not found" });
}


generateInvoicePdf(order, res);



    
  } catch (error) {
    console.log("downloadInvoice error",error)
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({success:false,message:"server error"})

    
  }
}

module.exports={
    getOrderDetail,
    getMyOrders,
    cancelOrder,
    cancelOrderItem,
    returnOrder,
    downloadInvoice,
}