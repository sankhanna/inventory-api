const mongoose = require("mongoose");
const Schema = mongoose.Schema;

//mongoose.set('useCreateIndex', true);

const TokenSchema = mongoose.Schema({
  device_id: { type: String, required: true },
  user_id: { type: Number, required: true },
  user_name: { type: String, required: true },
  create_date: { type: Number, required: true },
  otp: { type: Number, required: true },
});

module.exports = mongoose.model("token", TokenSchema);
