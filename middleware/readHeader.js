const Tokens = require("../models/Tokens");

async function readHeader(req, res, next) {
  if (req.originalUrl == "/api/user/validateUser" || req.originalUrl == "/api/token/createToken") {
    next();
  } else {
    if (req.headers.device_id == undefined || req.headers.device_id == "" || req.headers.device_id == null || req.headers.user_id == undefined || req.headers.user_id == "" || req.headers.user_id == null) {
      res.status(404).json(addMarkup(0, "Security Check Failed.", { message: {} }));
    } else {
      const token = await Tokens.findOne({ device_id: req.headers.device_id, user_id: req.headers.user_id });
      if (token == null) {
        res.status(404).json(addMarkup(0, "Security Check Failed.", { message: {} }));
      } else {
        next();
      }
    }
  }
}
module.exports = readHeader;
