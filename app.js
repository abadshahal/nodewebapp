const express=require("express");
const app=express()
const path=require("path");

const cookieParser=require("cookie-parser");
const passport=require("./config/passport")
const dotenv=require("dotenv").config()
const db=require("./config/db")
const verifyToken=require("./middlewares/verifyToken")
const userRouter=require("./routes/userRouter")
const adminRouter=require("./routes/adminRouter");
const profileRoutes=require("./routes/profileRoutes")

app.use(express.json())
app.use(express.urlencoded({extended:true}))

app.use(cookieParser())

app.use(passport.initialize())

app.set("view engine","ejs")
app.set("views",[path.join(__dirname,"views/admin"),path.join(__dirname,"views/user")])
app.use(express.static(path.join(__dirname,"public")))
app.use("/admin",adminRouter)
app.use("/",userRouter)
app.use("/",profileRoutes)


db();


console.log(process.env.MONGODB_URI)
app.listen(process.env.PORT,()=>{
    console.log("server running http://localhost:3000/home")
})

module.exports=app;