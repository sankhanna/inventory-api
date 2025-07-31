const mongoose = require("mongoose");
require("dotenv").config();
const Products = require("../models/Product");
const purchaseOthers = require("../models/Purchases_other");

mongoose.connect(process.env.DB_URL, { useNewUrlParser: true, useUnifiedTopology: true });

function roundToTwo(num) {
  return +(Math.round(num + "e+2") + "e-2");
}

(async function () {
  let chemicalProducts = await Products.find({ product_group: "Chemical" });

  for (let counter = 0; counter < chemicalProducts.length; counter++) {
    const doc = chemicalProducts[counter];
    let lastPP = 0;
    const lastPurchase = await purchaseOthers.findOne({ transactions: { $elemMatch: { product_id: doc._id } } }).sort({ purchase_date: -1 });

    if (lastPurchase) {
      lastPurchase.transactions.map((item) => {
        if (JSON.stringify(item.product_id) == JSON.stringify(doc._id)) lastPP = (item.value + item.cgst + item.sgst + item.igst) / item.qty;
      });
    }
    console.log(doc._id + "," + doc.product_name + "," + roundToTwo(lastPP));
  }
  process.exit();
})();
