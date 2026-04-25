
const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
};


const errorHandler = (err, req, res, next) => {
  console.error(`[ERROR] ${err.message}`);

  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  // API request → JSON response
  if (req.xhr || req.headers.accept?.includes("application/json")) {
    return res.status(statusCode).json({ success: false, message });
  }

 
  return res.status(statusCode).render("user/page-404");
};

module.exports = { notFound, errorHandler };