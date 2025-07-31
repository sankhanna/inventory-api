const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const PurchaseOtherSchema = mongoose.Schema({
  purchase_type: { type: Schema.Types.ObjectId, required: true, ref: "Accounts" },
  purchase_date: { type: Date, required: true },
  bill_no: { type: String, required: true },
  bill_date: { type: Date, required: false },
  gr_no: { type: String, required: false },
  gr_date: { type: Date, required: false },
  transport_id: { type: Schema.Types.ObjectId, required: false, ref: "Transport" },
  nob: { type: String, required: false },
  account_id: { type: Schema.Types.ObjectId, required: true, ref: "Accounts" },

  transactions: [
    {
      product_id: { type: Schema.Types.ObjectId, required: true, ref: "Product" },
      department_id: { type: String, required: true },
      pcs: { type: Number, required: false },
      qty: { type: Number, required: true },
      rate: { type: Number, required: true },
      value: { type: Number, required: true },
      discount_percent: { type: Number, required: true, default: 0 },
      discount: { type: Number, required: true },
      igst_rate: { type: Number, required: true },
      igst: { type: Number, required: true },
      cgst_rate: { type: Number, required: true },
      cgst: { type: Number, required: true },
      sgst_rate: { type: Number, required: true },
      sgst: { type: Number, required: true },
    },
  ],
  bill_amount: { type: Number, required: true },

  igst: { type: Number, required: true },
  cgst: { type: Number, required: true },
  sgst: { type: Number, required: true },

  total_amount: { type: Number, required: true },
  discount: { type: Number, required: true },
  tcs: { type: Number, required: true },
  round_off: { type: Number, required: true },

  create_user_id: { type: Number, required: true },
  change_user_id: { type: Number, required: true },
  create_date: { type: Date, required: true },
  change_date: { type: Date, required: true },
});

module.exports = mongoose.model("purchase_other", PurchaseOtherSchema);
