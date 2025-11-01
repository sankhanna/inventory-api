const Joi = require("joi-oid");
const express = require("express");
const router = express.Router();
const FinishedReceipts = require("../models/FinishedReceipts");
const FinishedIssue = require("../models/FinishedIssue");
const verifyID = require("../utils/verify");
const Accounts = require("../models/Accounts");
const Products = require("../models/Product");
const findAccountName = require("../services/findAccountName");
const findProductName = require("../services/findProductName");
const UserModel = require("../models/Users");
const findUserName = require("../services/findUserName");

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
    finished_receipt_id: Joi.objectId().optional(),
    transaction_type: Joi.string().valid("O", "T"),
    transaction_date: Joi.date().raw().required(),
    account_id: Joi.objectId().optional(),
    transactions: Joi.array().items(transaction),
  });
  return schema;
}

router.get("/", async (req, res) => {
  const accounts = await Accounts.find();
  const products = await Products.find();
  const finishedreceipt = await FinishedReceipts.find().sort({ _id: -1 });
  const users = await UserModel.find();

  records = [];
  records = finishedreceipt.map((item) => {
    account_name = findAccountName(accounts, item.account_id);

    change_user_name = findUserName(users, item.change_user_id);
    create_user_name = findUserName(users, item.create_user_id);

    const nitem = formatFinishedReceipt(item, account_name, products, change_user_name, item.change_date, create_user_name, item.create_date);
    return nitem;
  });

  return res.status(SUCCESS).send(addMarkup(1, "finished receipt Obtained Successfully", { finishedreceipts: records }));
});

router.get("/FinishedReceiptDetail/:id", async (req, res) => {
  if (verifyID(req.params.id) == false) return res.status(BADREQUEST).json(addMarkup(0, "invalid id provided", { materialreceipt: {} }));

  const finishedreceipt = await FinishedReceipts.findOne({ _id: req.params.id });
  if (finishedreceipt == null) return res.status(BADREQUEST).send(addMarkup(0, "entry not found", { finishedreceipt: {} }));

  return res.status(SUCCESS).send(addMarkup(1, "finished receipt entry Obtained Successfully", { finishedreceipt: finishedreceipt }));
});

router.post("/", async (req, res) => {
  const schema = validation_schema();

  const result = schema.validate(req.body);
  if (result.error != null) {
    return res.status(BADREQUEST).send(addMarkup(0, result.error.message, {}));
  }

  let finishedreceipt = null;
  if (result.value.finished_receipt_id == null) {
    finishedreceipt = new FinishedReceipts({
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
      return { product_id: item.product_id, qty: item.qty, pcs: item.pcs, rate: item.rate, value: item.value };
    });
    finishedreceipt.transactions = xtransactions;
  } else {
    finishedreceipt = await FinishedReceipts.findById({ _id: result.value.finished_receipt_id });

    finishedreceipt.change_date = new Date();
    finishedreceipt.change_user_id = req.headers.user_id;
    finishedreceipt.transaction_type = result.value.transaction_type;
    finishedreceipt.transaction_date = result.value.transaction_date;
    finishedreceipt.account_id = result.value.account_id;

    transactions = result.value.transactions;
    transactions.map((item) => {
      if (item.row_record_id == undefined) {
        finishedreceipt.transactions.push({ product_id: item.product_id, qty: item.qty, pcs: item.pcs, rate: item.rate, value: item.value });
      }
    });

    for (counter = 0; counter < finishedreceipt.transactions.length; counter++) {
      transactions = result.value.transactions;
      transactions.map((item) => {
        if (item.row_record_id != null) {
          if (JSON.stringify(item.row_record_id) == JSON.stringify(finishedreceipt.transactions[counter]._id)) {
            finishedreceipt.transactions[counter].product_id = item.product_id;
            finishedreceipt.transactions[counter].qty = item.qty;
            finishedreceipt.transactions[counter].pcs = item.pcs;
            finishedreceipt.transactions[counter].rate = item.rate;
            finishedreceipt.transactions[counter].value = item.value;
          }
        }
      });
    }
  }
  const saveResult = await finishedreceipt.save();

  if (saveResult) {
    return res.status(SUCCESS).send(addMarkup(1, "Entry saved successfully", { finishedreceipt: saveResult }));
  } else {
    return res.status(BADREQUEST).send(addMarkup(0, "Could not save material receipt", { finishedreceipt: {} }));
  }
});

function find_finished_cloth_balance_with_detail(start_date, end_date, finishedreceipt, finishedissue, productID) {
  open_total_qty = 0;
  tran_total_qty = 0;
  out_for_job = 0;

  d2 = new Date(start_date);
  finishedreceipt.map((item) => {
    transactions = item.transactions;
    d1 = new Date(item.transaction_date);

    if (d1 < d2) {
      transactions.map((itm) => {
        if (JSON.stringify(itm.product_id) == JSON.stringify(productID)) {
          if (item.account_id == undefined) open_total_qty += itm.qty;
          else out_for_job -= itm.qty;
        }
      });
    } else {
      transactions.map((itm) => {
        if (JSON.stringify(itm.product_id) == JSON.stringify(productID)) {
          if (item.account_id == undefined) tran_total_qty += itm.qty;
          else out_for_job -= itm.qty;
        }
      });
    }
  });

  tran_total_qty_issued = 0;
  finishedissue.map((ite) => {
    transactions = ite.transactions;
    d1 = new Date(ite.transaction_date);

    if (d1 < d2) {
      transactions.map((itm) => {
        if (JSON.stringify(itm.product_id) == JSON.stringify(productID)) {
          if (ite.account_id == undefined) open_total_qty -= itm.qty;
          else out_for_job += itm.qty;
        }
      });
    } else {
      transactions.map((itm) => {
        if (JSON.stringify(itm.product_id) == JSON.stringify(productID)) {
          if (ite.account_id == undefined) tran_total_qty_issued += itm.qty;
          else out_for_job += itm.qty;
        }
      });
    }
  });

  item = {};

  item.opening = open_total_qty;
  item.total_receipt = tran_total_qty;
  item.tran_total_qty_issued = tran_total_qty_issued;
  item.out_for_job = out_for_job;
  item.balance = open_total_qty + tran_total_qty - out_for_job - tran_total_qty_issued;

  return item;
}

function find_finished_cloth_balance(finishedreceipt, finishedissue, productID) {
  total_qty = 0;
  total_pcs = 0;
  total_value = 0;

  finishedreceipt.map((item) => {
    transactions = item.transactions;
    transactions.map((itm) => {
      if (JSON.stringify(itm.product_id) == JSON.stringify(productID)) {
        total_qty += itm.qty;
        total_pcs += itm.pcs;
        total_value += itm.value;
      }
    });
  });

  total_qty_issued = 0;
  total_pcs_issued = 0;
  total_value_issued = 0;
  finishedissue.map((ite) => {
    transactions = ite.transactions;
    transactions.map((itm) => {
      if (JSON.stringify(itm.product_id) == JSON.stringify(productID)) {
        total_qty -= itm.qty;
        total_pcs -= itm.pcs;
        total_value -= itm.value;
      }
    });
  });

  item = {};

  item.balance = total_qty;
  item.pcs = total_pcs;
  item.value = total_value;

  return item;
}

router.get("/PendingFinishedReceipt/:productID", async (req, res) => {
  if (verifyID(req.params.productID) == false) return res.status(BADREQUEST).json(addMarkup(0, "invalid id provided", { FinishedReceipts: [] }));

  start_date = req.query.start_date;
  end_date = req.query.end_date;

  const finishedreceipt = await FinishedReceipts.find({ transaction_date: { $lte: new Date(end_date) } });
  const finishedissue = await FinishedIssue.find({ transaction_date: { $lte: new Date(end_date) } });

  const item = find_finished_cloth_balance(finishedreceipt, finishedissue, req.params.productID);

  return res.status(SUCCESS).send(addMarkup(1, "balance qty", { FinishedReceipts: item }));
});

router.get("/GetStatementOfBalance", async (req, res) => {
  const all_products = await Products.find();

  start_date = req.query.start_date;
  end_date = req.query.end_date;

  const finishedreceipt = await FinishedReceipts.find({ transaction_date: { $lte: new Date(end_date) } });
  const finishedissue = await FinishedIssue.find({ transaction_date: { $lte: new Date(end_date) } });

  result = [];
  await Promise.all(
    all_products.map(async (item) => {
      if (item.product_group == "Finished Cloth") {
        const pitem = find_finished_cloth_balance_with_detail(start_date, end_date, finishedreceipt, finishedissue, item._id);
        result.push({ ...pitem, _id: item._id, product_name: item.product_name });
      }
    })
  );

  return res.status(SUCCESS).send(addMarkup(1, "balance qty", { result: result }));
});

router.get("/GetJobPartyWiseBalance/:accountID", async (req, res) => {
  if (verifyID(req.params.accountID) == false) return res.status(BADREQUEST).json(addMarkup(0, "invalid id provided", { FinishedReceipts: [] }));

  const all_products = await Products.find();

  end_date = req.query.end_date;

  const finishedreceipt = await FinishedReceipts.find({ account_id: req.params.accountID, transaction_date: { $lte: new Date(end_date) } });
  const finishedissue = await FinishedIssue.find({ account_id: req.params.accountID, transaction_date: { $lte: new Date(end_date) } });

  result = [];
  all_products.map((item) => {
    if (item.product_group == "Finished Cloth") {
      const pitem = find_finished_cloth_balance(finishedreceipt, finishedissue, item._id);
      result.push({ ...pitem, _id: item._id, product_name: item.product_name });
    }
  });

  return res.status(SUCCESS).send(addMarkup(1, "balance qty", { result: result }));
});

function formatFinishedReceipt(item, account_name, products, change_user_name, change_date, create_user_name, create_date) {
  trn = [];
  transactions = item.transactions;
  trn = transactions.map((tm) => {
    product_name = findProductName(products, tm.product_id);
    return { product_id: tm.product_id, product_name, qty: tm.qty, pcs: tm.pcs, rate: tm.rate, value: tm.value };
  });

  const it = { _id: item._id, transaction_type: item.transaction_type, account_id: item.account_id, transaction_date: item.transaction_date, transactions: trn };
  const nitem = { ...{ account_name, change_user_name, change_date, create_user_name, create_date }, ...it };

  return nitem;
}

module.exports = router;
