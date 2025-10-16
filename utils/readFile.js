const fs = require("fs");
const path = require("path");

function get_file_content(file_name) {
  var file_content = "";
  try {
    //var appDir = path.dirname(require.main.filename);
    const filePath = path.join(process.cwd(), "presets", file_name);
    file_content = fs.readFileSync(filePath, "utf8");
  } catch (error) {}
  return file_content;
}

module.exports = get_file_content;
