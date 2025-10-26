const Joi = require("joi-oid");
const express = require("express");
const router = express.Router();
const OpeningStock = require("../models/OpeningStock");

function validation_schema() {
  const schema = Joi.object({ current_record_id: Joi.objectId().optional(), product_id: Joi.objectId().required(), qty: Joi.number().required(), rate: Joi.number().required(), value: Joi.number().required() });
  return schema;
}

router.get("/", async (req, res) => {
  const pipeline = [
    { $lookup: { from: "products", localField: "product_id", foreignField: "_id", as: "product" } },
    { $lookup: { from: "users", localField: "change_user_id", foreignField: "id", as: "changeUser" } },
    { $lookup: { from: "users", localField: "create_user_id", foreignField: "id", as: "createUser" } },
    { $unwind: { path: "$product", preserveNullAndEmptyArrays: true } },
    { $unwind: { path: "$changeUser", preserveNullAndEmptyArrays: true } },
    { $unwind: { path: "$createUser", preserveNullAndEmptyArrays: true } },
    { $project: { _id: 1, product_id: 1, qty: 1, rate: 1, value: 1, create_date: 1, change_date: 1, "product.product_name": 1, "createUser.complete_name": 1, "changeUser.complete_name": 1 } },
    { $sort: { product_id: 1 } },
  ];

  const os = await OpeningStock.aggregate(pipeline).sort({ product_id: 1 });
  const result = os.map((item) => {
    return { _id: item._id, product_id: item.product_id, product_name: item?.product.product_name, qty: item.qty, rate: item.rate, value: item.value, create_date: item.create_date, change_date: item.change_date };
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
