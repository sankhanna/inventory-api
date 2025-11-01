const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  complete_name: { type: String, required: true, trim: true },
  abbr: { type: String, required: true, trim: true, maxlength: 10 },
  username: { type: String, required: true, unique: true, trim: true },
  password: { type: String, required: true },
  mobile: { type: String, default: "", trim: true },
});

userSchema.index({ username: 1 });
userSchema.index({ id: 1 });

module.exports = mongoose.model("user", userSchema);
