const Joi = require("joi-oid");
const express = require("express");
const router = express.Router();
const MaterialIssueOther = require("../models/MaterialIssueothers");
const verifyID = require("../utils/verify");
const Loadworkshops = require("../services/productionworkshops");
const Products = require("../models/Product");
const findProductName = require("../services/findProductName");
const findWorkshopName = require("../services/findWorkshopName");
const UserModel = require("../models/Users");
const findUserName = require("../services/findUserName");

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
  const materialissueother = await MaterialIssueOther.find({ transaction_date: { $gte: new Date(start_date), $lte: new Date(end_date) } }).sort({ transaction_date: -1 });
  const users = await UserModel.find();

  records = [];
  materialissueother.map((item) => {
    process_record = true;

    if (filter_workshop_id != "") {
      process_record = item.to_workshop_id == filter_workshop_id ? true : false;
    }

    if (process_record) {
      workshop_name = findWorkshopName(workshops, item.workshop_id);
      to_workshop_name = findWorkshopName(workshops, item.to_workshop_id);

      change_user_name = findUserName(users, item.change_user_id);
      create_user_name = findUserName(users, item.create_user_id);

      const nitem = formatMaterialIssueOtherRow(item, workshop_name, to_workshop_name, products, change_user_name, item.change_date, create_user_name, item.create_date);

      records.push(nitem);
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
  trn = [];
  transactions = item.transactions;
  trn = transactions.map((tm) => {
    product_name = findProductName(products, tm.product_id);
    return { product_id: tm.product_id, product_name, qty: tm.qty, rate: tm.rate, value: tm.value };
  });

  const it = { _id: item._id, workshop_id: item.workshop_id, to_workshop_id: item.to_workshop_id, transaction_type: item.transaction_type, transaction_date: item.transaction_date, transactions: item.transactions };
  const nitem = { ...{ workshop_name, to_workshop_name, change_user_name, change_date, create_user_name, create_date }, ...it, transactions: trn };

  return nitem;
}

module.exports = router;
