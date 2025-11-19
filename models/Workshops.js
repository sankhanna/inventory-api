const mongoose = require("mongoose");

const workshopSchema = new mongoose.Schema({
  _id: { type: Number, required: true },
  name: { type: String, required: true, trim: true },
  entry_exit: { type: String, required: true, trim: true },
});

module.exports = mongoose.model("workshops", workshopSchema);
