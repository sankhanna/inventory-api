const mongoose = require("mongoose");
const Schema = mongoose.Schema;

//mongoose.set('useCreateIndex', true);

const OpeningStockSchema = mongoose.Schema({
  product_id: { type: Schema.Types.ObjectId, required: true, ref: "Products" },
  qty: { type: Number, required: true },
  rate: { type: Number, required: true },
  value: { type: Number, required: true },
  create_user_id: { type: Number, required: true },
  change_user_id: { type: Number, required: true },
  create_date: { type: Date, required: true, default: () => new Date() },
  change_date: { type: Date, required: true, default: () => new Date() },
});

module.exports = mongoose.model("openingstock", OpeningStockSchema);
