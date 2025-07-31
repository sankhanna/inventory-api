const mongoose = require("mongoose");
const Schema = mongoose.Schema;

//mongoose.set('useCreateIndex', true);

const StatesSchema = mongoose.Schema({
  state_name: { type: String, required: true },
  state_code: { type: String, required: true },
});

module.exports = mongoose.model("states", StatesSchema);
