const mongoose = require("mongoose");
const Schema = mongoose.Schema;

//mongoose.set('useCreateIndex', true);

const GroupsSchema = mongoose.Schema({
  group_name: { type: String, required: true },
});

module.exports = mongoose.model("groups", GroupsSchema);
