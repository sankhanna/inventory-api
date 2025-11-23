const Joi = require("joi-oid");
const express = require("express");
const router = express.Router();
const MaterialIssueOther = require("../models/MaterialIssueothers");
const verifyID = require("../utils/verify");
const Loadworkshops = require("../services/productionworkshops");
const Products = require("../models/Product");
const findWorkshopName = require("../services/findWorkshopName");

function validation_schema() {
  const transaction = Joi.object().keys({
    row_record_id: Joi.objectId().optional(),
    product_id: Joi.objectId().required(),
    qty: Joi.number().required(),
    rate: Joi.number().required(),
    value: Joi.number().required(),
  });

  const schema = Joi.object({
    record_id: Joi.objectId().optional(),
    transaction_type: Joi.string().valid("T", "W"),
    transaction_date: Joi.date().raw().required(),
    workshop_id: Joi.number().required(),
    to_workshop_id: Joi.number().required(),
    transactions: Joi.array().items(transaction),
  });
  return schema;
}

router.get("/", async (req, res) => {
  start_date = req.query.start_date;
  end_date = req.query.end_date;
  filter_workshop_id = req.query.filter_workshop_id;

  const products = await Products.find();
  const workshops = Loadworkshops();
  const filters = { transaction_date: { $gte: new Date(start_date), $lte: new Date(end_date) } };
  const pipeLine = [
    { $match: filters },
    { $unwind: { path: "$transactions", preserveNullAndEmptyArrays: true } },
    { $lookup: { from: "products", localField: "transactions.product_id", foreignField: "_id", as: "product_info" } },
    { $unwind: { path: "$product_info", preserveNullAndEmptyArrays: true } },
    { $addFields: { "transactions.product_name": "$product_info.product_name" } },
    {
      $group: {
        _id: "$_id",
        transactions: { $push: "$transactions" },
        change_user_id: { $first: "$change_user_id" },
        create_user_id: { $first: "$create_user_id" },
        transaction_date: { $first: "$transaction_date" },
        transaction_type: { $first: "$transaction_type" },
        workshop_id: { $first: "$workshop_id" },
        to_workshop_id: { $first: "$to_workshop_id" },
      },
    },
    { $lookup: { from: "users", localField: "change_user_id", foreignField: "id", as: "changeUser" } },
    { $lookup: { from: "users", localField: "create_user_id", foreignField: "id", as: "createUser" } },
    { $unwind: { path: "$changeUser", preserveNullAndEmptyArrays: true } },
    { $unwind: { path: "$createUser", preserveNullAndEmptyArrays: true } },
    { $sort: { transaction_date: -1 } },
  ];
  const materialissueother = await MaterialIssueOther.aggregate(pipeLine);

  const records = materialissueother.map((item) => {
    let process_record = true;

    if (filter_workshop_id != "") {
      process_record = item.to_workshop_id == filter_workshop_id ? true : false;
    }

    if (process_record) {
      workshop_name = findWorkshopName(workshops, item.workshop_id);
      to_workshop_name = findWorkshopName(workshops, item.to_workshop_id);

      create_user_name = item.createUser?.complete_name || "";
      change_user_name = item.changeUser?.complete_name || "";

      const nitem = formatMaterialIssueOtherRow(item, workshop_name, to_workshop_name, products, change_user_name, item.change_date, create_user_name, item.create_date);

      return nitem;
    }
  });

  return res.status(SUCCESS).send(addMarkup(1, "material issue other Obtained Successfully", { materialissueother: records }));
});

router.get("/MaterialIssueOtherDetail/:id", async (req, res) => {
  if (verifyID(req.params.id) == false) return res.status(BADREQUEST).json(addMarkup(0, "invalid id provided", { materialissueother: {} }));

  let mi = await MaterialIssueOther.findOne({ _id: req.params.id });
  if (mi == null) return res.status(BADREQUEST).send(addMarkup(0, "entry not found", { materialissueother: {} }));

  return res.status(SUCCESS).send(addMarkup(1, "material issue entry Obtained Successfully", { materialissueother: mi }));
});

router.post("/", async (req, res) => {
  const schema = validation_schema();

  const result = schema.validate(req.body);
  if (result.error != null) {
    return res.status(BADREQUEST).send(addMarkup(0, result.error.message, {}));
  }

  let materialissueother = null;
  if (result.value.record_id == null) {
    materialissueother = new MaterialIssueOther({
      transaction_type: result.value.transaction_type,
      transaction_date: result.value.transaction_date,
      workshop_id: result.value.workshop_id,
      to_workshop_id: result.value.to_workshop_id,
      create_date: new Date(),
      change_date: new Date(),
      create_user_id: req.headers.user_id,
      change_user_id: req.headers.user_id,
    });

    xtransactions = [];
    transactions = result.value.transactions;
    xtransactions = transactions.map((item) => {
      return { product_id: item.product_id, qty: item.qty, rate: item.rate, value: item.value };
    });
    materialissueother.transactions = xtransactions;
  } else {
    materialissueother = await MaterialIssueOther.findById({ _id: result.value.record_id });

    materialissueother.change_date = new Date();
    materialissueother.change_user_id = req.headers.user_id;
    materialissueother.transaction_type = result.value.transaction_type;
    materialissueother.transaction_date = result.value.transaction_date;
    materialissueother.workshop_id = result.value.workshop_id;
    materialissueother.to_workshop_id = result.value.to_workshop_id;

    transactions = result.value.transactions;
    transactions.map((item) => {
      if (item.row_record_id == undefined) {
        materialissueother.transactions.push({ product_id: item.product_id, qty: item.qty, rate: item.rate, value: item.value });
      }
    });

    for (counter = 0; counter < materialissueother.transactions.length; counter++) {
      transactions = result.value.transactions;
      transactions.map((item) => {
        if (item.row_record_id != null) {
          if (JSON.stringify(item.row_record_id) == JSON.stringify(materialissueother.transactions[counter]._id)) {
            materialissueother.transactions[counter].product_id = item.product_id;
            materialissueother.transactions[counter].qty = item.qty;
            materialissueother.transactions[counter].rate = item.rate;
            materialissueother.transactions[counter].value = item.value;
          }
        }
      });
    }
  }
  const saveResult = await materialissueother.save();

  if (saveResult) {
    return res.status(SUCCESS).send(addMarkup(1, "Entry saved successfully", { materialissueother: saveResult }));
  } else {
    return res.status(BADREQUEST).send(addMarkup(0, "Could not save material issue", { materialissueother: {} }));
  }
});

function formatMaterialIssueOtherRow(item, workshop_name, to_workshop_name, products, change_user_name, change_date, create_user_name, create_date) {
  const nitem = { ...item, workshop_name, to_workshop_name, change_user_name, change_date, create_user_name, create_date };
  return nitem;
}

module.exports = router;
