const express=require("express");
const app=express()
const path=require("path");
const dotenv=require("dotenv").config()
const db=require("./config/db")
const userRouter=require("./routes/userRouter")
app.use(express.json())
app.use(express.urlencoded({extended:true}))
app.set("view engine","ejs")
app.set("views",[path.join(__dirname,"views/admin"),path.join(__dirname,"views/user")])
app.use(express.static(path.join(__dirname,"public")))
app.use("/",userRouter)


db();

console.log(process.env.MONGODB_URI)
app.listen(process.env.PORT,()=>{
    console.log("server running")
})

module.exports=app;