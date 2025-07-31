const fs = require("fs");

function log(req, res, next) {
  try {
    if (req.originalUrl != "/api/product") {
      const current_time = new Date().toISOString();
      let file_path = "logs/log" + current_time.slice(0, 10) + ".log";
      var jsonBody = JSON.stringify(req.body);
      var message = "Received from " + req.get("X-Forwarded-For") + " : " + Date.now() + " : " + req.method + " " + req.originalUrl + " " + JSON.stringify(req.headers);
      if (req.method == "POST" || req.method == "PUT") {
        message += jsonBody;
      }
      console.log(message);
      fs.appendFile(file_path, "[" + new Date().toISOString() + "] " + message + jsonBody + "\n", (err) => {});
    }
  } catch (err) {
    console.log("Error in saving to log file");
  }
  next();
}

module.exports = log;
