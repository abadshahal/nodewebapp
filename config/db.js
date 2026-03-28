const mongoose=require("mongoose");
const dotenv=require("dotenv").config()

const conenctDB=async()=>{

    try {
      await  mongoose.connect(process.env.MONGODB_URI)
      console.log("db connected")
    } catch (error) {
        console.log("db connection error",error.message)
        process.exit(1)
    }
}

module.exports=conenctDB;