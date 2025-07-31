const mongoose = require("mongoose");
const Schema = mongoose.Schema;

//mongoose.set('useCreateIndex', true);

const AgentsSchema = mongoose.Schema({
  agent_name: { type: String, required: true },
  create_user_id: { type: Number, required: true },
  change_user_id: { type: Number, required: true },
  create_date: { type: Date, required: true },
  change_date: { type: Date, required: true },
});

module.exports = mongoose.model("agents", AgentsSchema);
