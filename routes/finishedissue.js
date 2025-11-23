const Joi = require("joi-oid");
const express = require("express");
const router = express.Router();
const FinishedIssue = require("../models/FinishedIssue");
const verifyID = require("../utils/verify");
const Products = require("../models/Product");
const findProductName = require("../services/findProductName");

function validation_schema() {
  const transaction = Joi.object().keys({
    row_record_id: Joi.objectId().optional(),
    product_id: Joi.objectId().required(),
    qty: Joi.number().required(),
    pcs: Joi.number().required(),
    rate: Joi.number().required(),
    value: Joi.number().required(),
  });

  const schema = Joi.object({
    finished_issue_id: Joi.objectId().optional(),
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
    { $lookup: { from: "users", localField: "change_user_id", foreignField: "id", as: "changeUser" } },
    { $lookup: { from: "users", localField: "create_user_id", foreignField: "id", as: "createUser" } },
    { $unwind: { path: "$account", preserveNullAndEmptyArrays: true } },
    { $unwind: { path: "$changeUser", preserveNullAndEmptyArrays: true } },
    { $unwind: { path: "$createUser", preserveNullAndEmptyArrays: true } },
    { $sort: { transaction_date: 1 } },
    { $project: { product_info: 0 } },
  ];

  const finsihedissue = await FinishedIssue.aggregate(pipeLine);

  const records = [];
  records = finsihedissue.map((item) => {
    account_name = itm.account?.account_name || "";
    create_user_name = itm.createUser?.complete_name || "";
    change_user_name = itm.changeUser?.complete_name || "";

    const nitem = formatFinishedIssue(item, account_name, products, change_user_name, item.change_date, create_user_name, item.create_date);
    return nitem;
  });

  return res.status(SUCCESS).send(addMarkup(1, "finished issue Obtained Successfully", { finishedissues: records }));
});

router.get("/FinishedIssueDetail/:id", async (req, res) => {
  if (verifyID(req.params.id) == false) return res.status(BADREQUEST).json(addMarkup(0, "invalid id provided", { finishedissue: {} }));

  let mi = await FinishedIssue.findOne({ _id: req.params.id });
  if (mi == null) return res.status(BADREQUEST).send(addMarkup(0, "entry not found", { finishedissue: {} }));

  return res.status(SUCCESS).send(addMarkup(1, "finished issue entry Obtained Successfully", { finishedissue: mi }));
});

router.post("/", async (req, res) => {
  const schema = validation_schema();

  const result = schema.validate(req.body);
  if (result.error != null) {
    return res.status(BADREQUEST).send(addMarkup(0, result.error.message, {}));
  }

  let finishedissue = null;
  if (result.value.finished_issue_id == null) {
    finishedissue = new FinishedIssue({
      transaction_date: result.value.transaction_date,
      account_id: result.value.account_id,
      transaction_type: result.value.transaction_type,
      create_date: new Date(),
      change_date: new Date(),
      create_user_id: req.headers.user_id,
      change_user_id: req.headers.user_id,
    });

    xtransactions = [];
    transactions = result.value.transactions;
    xtransactions = transactions.map((item) => {
      return { product_id: item.product_id, pcs: item.pcs, qty: item.qty, rate: item.rate, value: item.value };
    });
    finishedissue.transactions = xtransactions;
  } else {
    finishedissue = await FinishedIssue.findById({ _id: result.value.finished_issue_id });

    finishedissue.change_date = new Date();
    finishedissue.change_user_id = req.headers.user_id;
    finishedissue.transaction_type = result.value.transaction_type;
    finishedissue.transaction_date = result.value.transaction_date;
    finishedissue.account_id = result.value.account_id;

    transactions = result.value.transactions;
    transactions.map((item) => {
      if (item.row_record_id == undefined) {
        finishedissue.transactions.push({ product_id: item.product_id, pcs: item.pcs, qty: item.qty, rate: item.rate, value: item.value });
      }
    });

    for (counter = 0; counter < finishedissue.transactions.length; counter++) {
      transactions = result.value.transactions;
      transactions.map((item) => {
        if (item.row_record_id != null) {
          if (JSON.stringify(item.row_record_id) == JSON.stringify(finishedissue.transactions[counter]._id)) {
            finishedissue.transactions[counter].product_id = item.product_id;
            finishedissue.transactions[counter].pcs = item.pcs;
            finishedissue.transactions[counter].qty = item.qty;
            finishedissue.transactions[counter].rate = item.rate;
            finishedissue.transactions[counter].value = item.value;
          }
        }
      });
    }
  }
  const saveResult = await finishedissue.save();

  if (saveResult) {
    return res.status(SUCCESS).send(addMarkup(1, "Entry saved successfully", { finishedissue: saveResult }));
  } else {
    return res.status(BADREQUEST).send(addMarkup(0, "Could not save material issue", { finishedissue: {} }));
  }
});

function formatFinishedIssue(item, account_name, products, change_user_name, change_date, create_user_name, create_date) {
  trn = [];
  transactions = item.transactions;
  trn = transactions.map((tm) => {
    product_name = findProductName(products, tm.product_id);
    return { product_id: tm.product_id, product_name, pcs: tm.pcs, qty: tm.qty, rate: tm.rate, value: tm.value };
  });

  const it = { _id: item._id, transaction_type: item.transaction_type, account_id: item.account_id, transaction_date: item.transaction_date, transactions: item.transactions };
  const nitem = { ...{ account_name, change_user_name, change_date, create_user_name, create_date }, ...it, transactions: trn };

  return nitem;
}

module.exports = router;
