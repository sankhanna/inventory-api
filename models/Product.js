const mongoose = require("mongoose");
const Schema = mongoose.Schema;

//mongoose.set("useCreateIndex", true);

const ProductSchema = mongoose.Schema({
  product_name: { type: String, required: true },
  product_group: { type: String, required: true },
  prefferd_product: { type: Boolean, required: true, default: false },
  create_user_id: { type: Number, required: true },
  change_user_id: { type: Number, required: true },
  create_date: { type: Date, required: true },
  change_date: { type: Date, required: true },
});

module.exports = mongoose.model("product", ProductSchema);
