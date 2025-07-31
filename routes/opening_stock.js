const Joi = require("joi-oid");
const express = require("express");
const router = express.Router();
const Products = require("../models/Product");
const OpeningStock = require("../models/OpeningStock");
const findProductName = require("../services/findProductName");

function validation_schema() {
  const schema = Joi.object({ current_record_id: Joi.objectId().optional(), product_id: Joi.objectId().required(), qty: Joi.number().required(), rate: Joi.number().required(), value: Joi.number().required() });
  return schema;
}

router.get("/", async (req, res) => {
  const os = await OpeningStock.find().sort({ product_id: 1 });
  const products = await Products.find();

  let result = [];
  result = os.map((item) => {
    product_name = findProductName(products, item.product_id);
    return { _id: item._id, product_id: item.product_id, product_name, qty: item.qty, rate: item.rate, value: item.value, create_date: item.create_date, change_date: item.change_date };
  });

  if (result.length == 0) return res.status(SUCCESS).send(addMarkup(1, "No opening stock entry found.", { os: [] }));
  else return res.status(SUCCESS).send(addMarkup(1, "No opening stock entry found", { os: result }));
});

router.get("/:id", async (req, res) => {
  const os = await OpeningStock.findById({ _id: req.params.id });
  return res.status(SUCCESS).send(addMarkup(1, "os entry Obtained Successfully", { os: os }));
});

router.post("/", async (req, res) => {
  const schema = validation_schema();

  const result = schema.validate(req.body);
  if (result.error != null) {
    return res.status(BADREQUEST).send(addMarkup(0, result.error.message, {}));
  }

  let osentry = null;
  if (result.value.current_record_id == null) {
    osentry = new OpeningStock({
      product_id: result.value.product_id,
      qty: result.value.qty,
      rate: result.value.rate,
      value: result.value.value,
      create_date: new Date(),
      change_date: new Date(),
      create_user_id: req.headers.user_id,
      change_user_id: req.headers.user_id,
    });
  } else {
    osentry = await OpeningStock.findById({ _id: result.value.current_record_id });
    osentry.product_id = result.value.product_id;
    osentry.qty = result.value.qty;
    osentry.rate = result.value.rate;
    osentry.value = result.value.value;
    osentry.change_date = new Date();
    osentry.change_user_id = req.headers.user_id;
  }
  const saveResult = await osentry.save();

  if (saveResult) {
    return res.status(SUCCESS).send(addMarkup(1, "os entry saved successfully", { os: saveResult }));
  } else {
    return res.status(BADREQUEST).send(addMarkup(0, "Could not save product", { os: {} }));
  }
});

module.exports = router;
