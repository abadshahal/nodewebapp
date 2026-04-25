const express      = require("express");
const path         = require("path");
const cookieParser = require("cookie-parser");
const passport     = require("./config/passport");
const app = express();




app.use(express.json());


const userRouter     = require("./routes/userRouter");
const adminRouter    = require("./routes/adminRouter");
const profileRouter  = require("./routes/profileRouter");
const categoryRouter = require("./routes/categoryRouter");
const productRouter  = require("./routes/productRouter");   

const { notFound, errorHandler } = require("./middlewares/errorHandlers");
// app.use((req, res, next) => {
//   console.log(`${req.method} ${req.url}`);
//   next();
// });

// app.use((req, res, next) => {
//   console.log(`${req.method} ${req.url}`);
//   next();
// });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(passport.initialize());

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));


app.use("/", userRouter);
app.use("/profile",          profileRouter);
app.use("/admin/products",   productRouter);  
app.use("/admin/categories", categoryRouter);  
app.use("/admin",            adminRouter);     

app.use(notFound);
app.use(errorHandler);

module.exports = app;