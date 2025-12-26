const Joi = require("joi-oid");
const express = require("express");
const router = express.Router();
const MaterialIssue = require("../models/MaterialIssue");
const MaterialReceipts = require("../models/MaterialReceipts");
const verifyID = require("../utils/verify");
const Products = require("../models/Product");
const findProductName = require("../services/findProductName");

function validation_schema() {
  const transaction = Joi.object().keys({
    row_record_id: Joi.objectId().optional(),
    product_id: Joi.objectId().required(),
    material_receipt_ref_id: Joi.objectId().optional(),
    material_receipt_ref_str: Joi.string().optional(),
    pcs: Joi.number().required(),
    qty: Joi.number().required(),
    short: Joi.number().required(),
    nett_qty: Joi.number().required(),
    rate: Joi.number().required(),
    value: Joi.number().required(),
    batch_no: Joi.string().required(),
  });

  const schema = Joi.object({
    material_issue_id: Joi.objectId().optional(),
    workshop_id: Joi.number().required(),
    to_workshop_id: Joi.number().required(),
    transaction_type: Joi.string().valid("O", "T", "W"),
    transaction_date: Joi.date().raw().required(),
    account_id: Joi.objectId().optional(),
    transactions: Joi.array().items(transaction),
  });
  return schema;
}

router.get("/", async (req, res) => {
  const products = await Products.find();

  const pipeLine = [
    { $lookup: { from: "accounts", localField: "account_id", foreignField: "_id", as: "account" } },
    { $lookup: { from: "workshops", localField: "workshop_id", foreignField: "_id", as: "workshop" } },
    { $lookup: { from: "workshops", localField: "to_workshop_id", foreignField: "_id", as: "toworkshop" } },
    { $lookup: { from: "users", localField: "change_user_id", foreignField: "id", as: "changeUser" } },
    { $lookup: { from: "users", localField: "create_user_id", foreignField: "id", as: "createUser" } },
    { $unwind: { path: "$account", preserveNullAndEmptyArrays: true } },
    { $unwind: { path: "$workshop", preserveNullAndEmptyArrays: true } },
    { $unwind: { path: "$toworkshop", preserveNullAndEmptyArrays: true } },
    { $unwind: { path: "$changeUser", preserveNullAndEmptyArrays: true } },
    { $unwind: { path: "$createUser", preserveNullAndEmptyArrays: true } },
    { $project: { product_info: 0 } },
    { $sort: { transaction_date: -1 } },
  ];

  const materialissue = await MaterialIssue.aggregate(pipeLine);

  let records = [];
  records = materialissue.map((item) => {
    let workshop_name = item.workshop?.name || "";
    let to_workshop_name = item.toworkshop?.name || "";
    let account_name = item.account?.account_name || "";
    let create_user_name = item.createUser?.complete_name || "";
    let change_user_name = item.changeUser?.complete_name || "";

    const nitem = formatMaterialIssueRow(item, workshop_name, to_workshop_name, account_name, products, change_user_name, item.change_date, create_user_name, item.create_date);
    return nitem;
  });

  return res.status(SUCCESS).send(addMarkup(1, "material issue Obtained Successfully", { materialissues: records }));
});

async function find_reference(id) {
  const mr = await MaterialReceipts.find({ $or: [{ "transactions._id": id }] });
  return mr;
}

router.get("/MaterialIssueDetail/:id", async (req, res) => {
  if (verifyID(req.params.id) == false) return res.status(BADREQUEST).json(addMarkup(0, "invalid id provided", { materialissue: {} }));

  let mi = await MaterialIssue.findOne({ _id: req.params.id });
  if (mi == null) return res.status(BADREQUEST).send(addMarkup(0, "entry not found", { materialissue: {} }));

  return res.status(SUCCESS).send(addMarkup(1, "material issue entry Obtained Successfully", { materialissue: mi }));
});

router.post("/", async (req, res) => {
  const schema = validation_schema();

  const result = schema.validate(req.body);
  if (result.error != null) {
    return res.status(BADREQUEST).send(addMarkup(0, result.error.message, {}));
  }

  if (result.value.workshop_id === result.value.to_workshop_id) {
    return res.status(BADREQUEST).send(addMarkup(0, "Source and destination workshop cannot be same.", {}));
  }

  let error_found = false;
  result.value.transactions.map((item) => {
    if (formString(item.material_receipt_ref_str) == "" && formString(item.material_receipt_ref_id) == "" && result.value.workshop_id == "10") {
      error_found = true;
    }
  });
  if (error_found) {
    return res.status(BADREQUEST).send(addMarkup(0, "Reference is always required when issuing from grey warehouse.", {}));
  }

  let materialissue = null;
  if (result.value.material_issue_id == null) {
    materialissue = new MaterialIssue({
      workshop_id: result.value.workshop_id,
      to_workshop_id: result.value.to_workshop_id,
      transaction_date: result.value.transaction_date,
      account_id: result.value.account_id,
      transaction_type: result.value.transaction_type,
      create_date: new Date(),
      change_date: new Date(),
      create_user_id: req.headers.user_id,
      change_user_id: req.headers.user_id,
    });

    let xtransactions = [];
    let transactions = result.value.transactions;
    xtransactions = transactions.map((item) => {
      return {
        material_receipt_ref_id: item.material_receipt_ref_id,
        material_receipt_ref_str: item.material_receipt_ref_str,
        product_id: item.product_id,
        pcs: item.pcs,
        qty: item.qty,
        short: item.short,
        nett_qty: item.nett_qty,
        rate: item.rate,
        value: item.value,
        batch_no: item.batch_no,
      };
    });
    materialissue.transactions = xtransactions;
  } else {
    materialissue = await MaterialIssue.findById({ _id: result.value.material_issue_id });

    materialissue.change_date = new Date();
    materialissue.change_user_id = req.headers.user_id;
    materialissue.transaction_type = result.value.transaction_type;
    materialissue.transaction_date = result.value.transaction_date;
    materialissue.account_id = result.value.account_id;
    materialissue.workshop_id = result.value.workshop_id;
    materialissue.to_workshop_id = result.value.to_workshop_id;

    let transactions = result.value.transactions;
    transactions.map((item) => {
      if (item.row_record_id == undefined) {
        materialissue.transactions.push({
          product_id: item.product_id,
          material_receipt_ref_id: item.material_receipt_ref_id,
          material_receipt_ref_str: item.material_receipt_ref_str,
          pcs: item.pcs,
          qty: item.qty,
          short: item.short,
          nett_qty: item.nett_qty,
          rate: item.rate,
          value: item.value,
          batch_no: item.batch_no,
        });
      }
    });

    for (let counter = 0; counter < materialissue.transactions.length; counter++) {
      let transactions = result.value.transactions;
      transactions.map((item) => {
        if (item.row_record_id != null) {
          if (JSON.stringify(item.row_record_id) == JSON.stringify(materialissue.transactions[counter]._id)) {
            materialissue.transactions[counter].product_id = item.product_id;
            materialissue.transactions[counter].material_receipt_ref_id = item.material_receipt_ref_id;
            materialissue.transactions[counter].material_receipt_ref_str = item.material_receipt_ref_str;
            materialissue.transactions[counter].pcs = item.pcs;
            materialissue.transactions[counter].qty = item.qty;
            materialissue.transactions[counter].short = item.short;
            materialissue.transactions[counter].nett_qty = item.nett_qty;
            materialissue.transactions[counter].rate = item.rate;
            materialissue.transactions[counter].value = item.value;
            materialissue.transactions[counter].batch_no = item.batch_no;
          }
        }
      });
    }
  }
  const saveResult = await materialissue.save();

  if (saveResult) {
    return res.status(SUCCESS).send(addMarkup(1, "Entry saved successfully", { materialissue: saveResult }));
  } else {
    return res.status(BADREQUEST).send(addMarkup(0, "Could not save material issue", { materialissue: {} }));
  }
});

function formatMaterialIssueRow(item, workshop_name, to_workshop_name, account_name, products, change_user_name, change_date, create_user_name, create_date) {
  let transactions = item.transactions;
  const trn = transactions.map((tm) => {
    let product_name = findProductName(products, tm.product_id);
    return { material_receipt_ref_id: tm.material_receipt_ref_id, product_id: tm.product_id, product_name, pcs: tm.pcs, qty: tm.qty, short: tm.short, nett_qty: tm.nett_qty, value: tm.value };
  });

  const it = { _id: item._id, workshop_id: item.workshop_id, to_workshop_id: item.to_workshop_id, transaction_type: item.transaction_type, account_id: item.account_id, transaction_date: item.transaction_date, transactions: item.transactions };
  const nitem = { ...{ workshop_name, to_workshop_name, account_name, change_user_name, change_date, create_user_name, create_date }, ...it, transactions: trn };

  return nitem;
}

module.exports = router;
