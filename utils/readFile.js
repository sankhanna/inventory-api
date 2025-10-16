const fs = require("fs");
const path = require("path");

function get_file_content(file_name) {
  var file_content = "";
  try {
    var appDir = path.dirname(require.main.filename);
    file_content = fs.readFileSync("../presets/" + file_name, "utf8");
  } catch (error) {}
  return file_content;
}

module.exports = get_file_content;
