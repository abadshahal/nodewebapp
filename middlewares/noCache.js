const noCache = (req, res, next) => {
  res.set({
    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, private",
    "Pragma":        "no-cache",
    "Expires":       "-1",
    "Surrogate-Control": "no-store",
  });
  next();
};

module.exports = noCache;