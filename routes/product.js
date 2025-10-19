const NodeCache = require("node-cache");
const fs = require("fs");
const Joi = require("joi-oid");
const express = require("express");
const router = express.Router();
const Products = require("../models/Product");
const myCache = new NodeCache({ stdTTL: 3600 });

function validation_schema() {
  const schema = Joi.object({ product_id: Joi.objectId().optional(), product_name: Joi.string().min(2).max(100).required(), product_group: Joi.string().min(2).max(100).required(), prefferd_product: Joi.boolean().required() });
  return schema;
}

router.get("/", async (req, res) => {
  let products;
  const cacheKey = `data-products`;
  const cachedData = myCache.get(cacheKey);
  if (cachedData) {
    console.log("Serving Products from cache:", cacheKey);
    products = cachedData;
  } else {
    console.log("Refershing cache:", cacheKey);
    products = await Products.find().sort({ product_name: 1 });
    myCache.set(cacheKey, products);
  }

  if (products.length == 0) return res.status(SUCCESS).send(addMarkup(1, "No product Found", { products: [] }));
  else return res.status(SUCCESS).send(addMarkup(1, "product Obtained Successfully", { products }));
});

router.get("/productDetail/:id", async (req, res) => {
  const product = await Products.findById({ _id: req.params.id });
  return res.status(SUCCESS).send(addMarkup(1, "product Obtained Successfully", { product: product }));
});

router.post("/", async (req, res) => {
  const schema = validation_schema();

  const result = schema.validate(req.body);
  if (result.error != null) return res.status(BADREQUEST).send(addMarkup(0, result.error.message, {}));

  let Product = null;
  if (result.value.product_id == null) {
    Product = new Products({
      product_name: result.value.product_name,
      product_group: result.value.product_group,
      prefferd_product: result.value.prefferd_product,
      create_date: new Date(),
      change_date: new Date(),
      create_user_id: req.headers.user_id,
      change_user_id: req.headers.user_id,
    });
  } else {
    Product = await Products.findById({ _id: result.value.product_id });
    Product.product_name = result.value.product_name;
    Product.product_group = result.value.product_group;
    Product.prefferd_product = result.value.prefferd_product;
    Product.create_date = new Date();
    Product.create_user_id = req.headers.user_id;
    Product.change_date = new Date();
    Product.change_user_id = req.headers.user_id;
  }
  const saveResult = await Product.save();
  myCache.flushAll();
  if (saveResult) {
    return res.status(SUCCESS).send(addMarkup(1, "product successfully", { product: saveResult }));
  } else {
    return res.status(BADREQUEST).send(addMarkup(0, "Could not save product", { product: {} }));
  }
});

router.get("/productDetail/:id", async (req, res) => {
  const product = await Products.findById({ _id: req.params.id });
  return res.status(SUCCESS).send(addMarkup(1, "product Obtained Successfully", { product: product }));
});

router.delete("/:id", async (req, res) => {
  const product = await Products.findById({ _id: req.params.id });

  const Purchases = require("../models/Purchases");
  const PurchaseOther = require("../models/Purchases_other");
  const MaterialReceipts = require("../models/MaterialReceipts");
  const MaterialIssue = require("../models/MaterialIssue");
  const FinishedReceipts = require("../models/FinishedReceipts");
  const FinishedIssue = require("../models/FinishedIssue");
  const OpeningStock = require("../models/OpeningStock");
  const MaterialIssueOther = require("../models/MaterialIssueothers");

  let totalRecordFound = 0;
  totalRecordFound = await Purchases.find({ product_id: req.params.id }).count();
  totalRecordFound += await PurchaseOther.find({ transactions: { $elemMatch: { product_id: req.params.id } } }).count();
  totalRecordFound += await OpeningStock.find({ product_id: req.params.id }).count();
  totalRecordFound += await MaterialReceipts.find({ transactions: { $elemMatch: { product_id: req.params.id } } }).count();
  totalRecordFound += await MaterialIssue.find({ transactions: { $elemMatch: { product_id: req.params.id } } }).count();
  totalRecordFound += await MaterialIssueOther.find({ transactions: { $elemMatch: { product_id: req.params.id } } }).count();
  totalRecordFound += await FinishedReceipts.find({ transactions: { $elemMatch: { product_id: req.params.id } } }).count();
  totalRecordFound += await FinishedIssue.find({ transactions: { $elemMatch: { product_id: req.params.id } } }).count();

  if (totalRecordFound == 0) {
    await Products.deleteOne({ _id: req.params.id });
    myCache.flushAll();
    return res.status(SUCCESS).send(addMarkup(1, "product deleted Successfully", { product: product }));
  } else {
    return res.status(BADREQUEST).send(addMarkup(1, "product is in use and cannot be deleted.", { product: product }));
  }
});

module.exports = router;
