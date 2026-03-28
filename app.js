const express=require("express");
const app=express()
const dotenv=require("dotenv").config()
const db=require("./config/db")
db();

console.log(process.env.MONGODB_URI)
app.listen(process.env.PORT,()=>{
    console.log("server running")
})

module.exports=app;