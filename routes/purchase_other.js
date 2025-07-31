const Joi = require("joi-oid");
const express = require("express");
const router = express.Router();
const PO = require("../models/Purchases_other");
const verifyID = require("../utils/verify");
const Accounts = require("../models/Accounts");
const Products = require("../models/Product");
const findAccountName = require("../services/findAccountName");
const findProductName = require("../services/findProductName");
const readFile = require("../utils/readFile");
const findUserName = require("../services/findUserName");
const findTransportName = require("../services/findTransportName");
const Transport = require("../models/Transport");
const filecontent = require("../utils/readFile");

function validation_schema() {
  const transaction = Joi.object().keys({
    row_record_id: Joi.objectId().optional(),
    product_id: Joi.objectId().required(),
    department_id: Joi.string().required().valid("1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11"),
    pcs: Joi.number().required().min(0),
    qty: Joi.number().required().min(0.01),
    rate: Joi.number().required().min(0.01),
    value: Joi.number().required().min(0.01),
    discount_percent: Joi.number().required().min(0),
    discount: Joi.number().required().min(0),
    igst_rate: Joi.number().required().min(0),
    igst: Joi.number().required().min(0),
    cgst_rate: Joi.number().required().min(0),
    cgst: Joi.number().required().min(0),
    sgst_rate: Joi.number().required().min(0),
    sgst: Joi.number().required().min(0),
  });

  const schema = Joi.object({
    purchase_id: Joi.objectId().optional(),
    purchase_type: Joi.objectId().required(),
    purchase_date: Joi.date().raw().required(),
    bill_no: Joi.string().required(),
    bill_date: Joi.date().raw().optional().allow(""),
    gr_no: Joi.string().optional().allow(""),
    gr_date: Joi.date().raw().optional().allow(""),
    transport_id: Joi.objectId().optional(),
    nob: Joi.string().optional().allow(""),
    account_id: Joi.objectId().required(),
    transactions: Joi.array().items(transaction),

    bill_amount: Joi.number().required(),
    igst: Joi.number().required().min(0),
    cgst: Joi.number().required().min(0),
    sgst: Joi.number().required().min(0),
    tcs: Joi.number().required().min(0),
    round_off: Joi.number().required().min(-10000).max(10000),
    total_amount: Joi.number().required(),
    discount: Joi.number().required(),
  });
  return schema;
}

router.get("/", async (req, res) => {
  let filter_purchase_type = req.query.filter_purchase_type;
  let filter_account_id = req.query.filter_account_id;
  let filter_department_id = req.query.filter_department_id;
  let start_date = req.query.start_date;
  let end_date = req.query.end_date;

  const accounts = await Accounts.find();
  const products = await Products.find();
  const transports = await Transport.find();
  const tmpData = readFile("../presets/users.json");
  const users = JSON.parse(tmpData);

  let filter = {};
  if (filter_purchase_type != "") filter = { ...filter, purchase_type: filter_purchase_type };
  if (filter_account_id != "") filter = { ...filter, account_id: filter_account_id };

  if (start_date != "" && end_date != "") {
    // records = [];
    // records = PurchaseOther.filter((item) => {
    //   return item.purchase_date >= new Date(start_date) && item.purchase_date <= new Date(end_date);
    // });
    // PurchaseOther = records;

    let date_filter = { purchase_date: { $gte: new Date(start_date), $lte: new Date(end_date) } };

    filter = { ...filter, ...date_filter };
  }

  let PurchaseOther = await PO.find({ ...filter }).sort({ purchase_date: -1 });

  //   if (filter_purchase_type != "") {
  //     records = [];
  //     records = PurchaseOther.filter((item) => JSON.stringify(item.purchase_type) == JSON.stringify(filter_purchase_type));
  //     PurchaseOther = records;
  //   }

  //   if (filter_account_id != "") {
  //     records = [];
  //     records = PurchaseOther.filter((item) => JSON.stringify(item.account_id) == JSON.stringify(filter_account_id));
  //     PurchaseOther = records;
  //   }

  if (filter_department_id != "") {
    records = [];
    records = PurchaseOther.filter((item) => {
      has_department_entries = false;
      item.transactions.map((i) => {
        if (i.department_id == filter_department_id) {
          has_department_entries = true;
        }
      });
      if (has_department_entries) {
        return item;
      }
    });
    PurchaseOther = records;
  }

  records = [];
  records = PurchaseOther.map((item) => {
    purchase_type_name = findAccountName(accounts, item.purchase_type);
    account_name = findAccountName(accounts, item.account_id);
    transport_name = findTransportName(transports, item.transport_id);
    change_user_name = findUserName(users, item.change_user_id);
    create_user_name = findUserName(users, item.create_user_id);

    const nitem = formatPurchaseOtherRow(item, products, purchase_type_name, account_name, transport_name, change_user_name, item.change_date, create_user_name, item.create_date, filter_department_id);

    return nitem;
  });

  return res.status(SUCCESS).send(addMarkup(1, "material issue Obtained Successfully", { PurchaseOthers: records }));
});

router.get("/:id", async (req, res) => {
  if (verifyID(req.params.id) == false) return res.status(BADREQUEST).json(addMarkup(0, "invalid id provided", { PurchaseOther: {} }));

  const transports = JSON.parse(filecontent("transports.json"));
  const accounts = JSON.parse(filecontent("accounts.json"));
  const products = JSON.parse(filecontent("products.json"));

  //const accounts = await Accounts.find();
  //const products = await Products.find();
  //const transports = await Transport.find();
  const tmpData = readFile("../presets/users.json");
  const users = JSON.parse(tmpData);

  let item = await PO.findOne({ _id: req.params.id });
  if (item == null) return res.status(BADREQUEST).send(addMarkup(0, "entry not found", { PurchaseOther: {} }));

  purchase_type_name = findAccountName(accounts, item.purchase_type);
  account_name = findAccountName(accounts, item.account_id);
  transport_name = findTransportName(transports, item.transport_id);
  change_user_name = findUserName(users, item.change_user_id);
  create_user_name = findUserName(users, item.create_user_id);

  const nitem = formatPurchaseOtherRow(item, products, purchase_type_name, account_name, transport_name, change_user_name, item.change_date, create_user_name, item.create_date, 0);
  return res.status(SUCCESS).send(addMarkup(1, "material issue entry Obtained Successfully", { PurchaseOther: nitem }));
});

router.post("/", async (req, res) => {
  const schema = validation_schema();

  const result = schema.validate(req.body);
  if (result.error != null) return res.status(BADREQUEST).send(addMarkup(0, result.error.message, {}));
  if (result.value.transactions.length == 0) return res.status(BADREQUEST).send(addMarkup(0, "There must be at least one transaction in the purchase.", {}));

  let PurchaseOther = null;
  if (result.value.purchase_id == null) {
    PurchaseOther = new PO({
      purchase_type: result.value.purchase_type,
      purchase_date: result.value.purchase_date,
      bill_date: result.value.bill_date,
      account_id: result.value.account_id,
      bill_no: result.value.bill_no,
      gr_no: result.value.gr_no,
      gr_date: result.value.gr_date,
      transport_id: result.value.transport_id,
      nob: result.value.nob,
      create_date: new Date(),
      change_date: new Date(),
      create_user_id: req.headers.user_id,
      change_user_id: req.headers.user_id,
      bill_amount: result.value.bill_amount,
      igst: result.value.igst,
      cgst: result.value.cgst,
      sgst: result.value.sgst,
      tcs: result.value.tcs,
      round_off: result.value.round_off,
      total_amount: result.value.total_amount,
      discount: result.value.discount,
    });

    xtransactions = [];
    transactions = result.value.transactions;
    xtransactions = transactions.map((item) => {
      return {
        product_id: item.product_id,
        department_id: item.department_id,
        pcs: item.pcs,
        qty: item.qty,
        rate: item.rate,
        value: item.value,
        discount_percent: item.discount_percent,
        discount: item.discount,
        igst_rate: item.igst_rate,
        cgst_rate: item.cgst_rate,
        sgst_rate: item.sgst_rate,
        igst: item.igst,
        cgst: item.cgst,
        sgst: item.sgst,
      };
    });
    PurchaseOther.transactions = xtransactions;
  } else {
    PurchaseOther = await PO.findById({ _id: result.value.purchase_id });

    PurchaseOther.change_date = new Date();
    PurchaseOther.change_user_id = req.headers.user_id;

    PurchaseOther.purchase_type = result.value.purchase_type;
    PurchaseOther.purchase_date = result.value.purchase_date;
    PurchaseOther.bill_date = result.value.bill_date;
    PurchaseOther.account_id = result.value.account_id;
    PurchaseOther.bill_no = result.value.bill_no;
    PurchaseOther.gr_no = result.value.gr_no;
    PurchaseOther.gr_date = result.value.gr_date;
    PurchaseOther.transport_id = result.value.transport_id;
    PurchaseOther.nob = result.value.nob;
    PurchaseOther.bill_amount = result.value.bill_amount;
    PurchaseOther.igst = result.value.igst;
    PurchaseOther.cgst = result.value.cgst;
    PurchaseOther.sgst = result.value.sgst;
    PurchaseOther.tcs = result.value.tcs;
    PurchaseOther.round_off = result.value.round_off;
    PurchaseOther.total_amount = result.value.total_amount;
    PurchaseOther.discount = result.value.discount;

    transactions = result.value.transactions;
    transactions.map((item) => {
      if (item.row_record_id == undefined) {
        PurchaseOther.transactions.push({
          product_id: item.product_id,
          department_id: item.department_id,
          qty: item.qty,
          rate: item.rate,
          value: item.value,
          discount_percent: item.discount_percent,
          discount: item.discount,
          igst_rate: item.igst_rate,
          cgst_rate: item.cgst_rate,
          sgst_rate: item.sgst_rate,
          igst: item.igst,
          cgst: item.cgst,
          sgst: item.sgst,
        });
      }
    });

    for (counter = 0; counter < PurchaseOther.transactions.length; counter++) {
      transactions = result.value.transactions;
      transactions.map((item) => {
        if (item.row_record_id != null) {
          if (JSON.stringify(item.row_record_id) == JSON.stringify(PurchaseOther.transactions[counter]._id)) {
            PurchaseOther.transactions[counter].product_id = item.product_id;
            PurchaseOther.transactions[counter].department_id = item.department_id;
            PurchaseOther.transactions[counter].pcs = item.pcs;
            PurchaseOther.transactions[counter].qty = item.qty;
            PurchaseOther.transactions[counter].rate = item.rate;
            PurchaseOther.transactions[counter].value = item.value;
            PurchaseOther.transactions[counter].discount_percent = item.discount_percent;
            PurchaseOther.transactions[counter].discount = item.discount;

            PurchaseOther.transactions[counter].igst_rate = item.igst_rate;
            PurchaseOther.transactions[counter].cgst_rate = item.cgst_rate;
            PurchaseOther.transactions[counter].sgst_rate = item.sgst_rate;

            PurchaseOther.transactions[counter].igst = item.igst;
            PurchaseOther.transactions[counter].cgst = item.cgst;
            PurchaseOther.transactions[counter].sgst = item.sgst;
          }
        }
      });
    }
  }
  const saveResult = await PurchaseOther.save();

  if (saveResult) return res.status(SUCCESS).send(addMarkup(1, "Entry saved successfully", { PurchaseOther: saveResult }));
  else return res.status(BADREQUEST).send(addMarkup(0, "Could not save material issue", { PurchaseOther: {} }));
});

function formatPurchaseOtherRow(item, products, purchase_type_name, account_name, transport_name, change_user_name, change_date, create_user_name, create_date, filter_department_id) {
  trn = [];
  transactions = item.transactions;
  transactions.map((tm) => {
    product_name = findProductName(products, tm.product_id);
    if (filter_department_id != "") {
      if (tm.department_id == filter_department_id) {
        trn.push({
          _id: tm._id,
          product_id: tm.product_id,
          product_name,
          department_id: tm.department_id,
          pcs: tm.pcs,
          qty: tm.qty,
          rate: tm.rate,
          value: tm.value,
          discount_percent: tm.discount_percent,
          discount: tm.discount,
          igst_rate: tm.igst_rate,
          cgst_rate: tm.cgst_rate,
          sgst_rate: tm.sgst_rate,
          igst: tm.igst,
          cgst: tm.cgst,
          sgst: tm.sgst,
        });
      }
    } else {
      trn.push({
        _id: tm._id,
        product_id: tm.product_id,
        product_name,
        department_id: tm.department_id,
        pcs: tm.pcs,
        qty: tm.qty,
        rate: tm.rate,
        value: tm.value,
        discount_percent: tm.discount_percent,
        discount: tm.discount,
        igst_rate: tm.igst_rate,
        cgst_rate: tm.cgst_rate,
        sgst_rate: tm.sgst_rate,
        igst: tm.igst,
        cgst: tm.cgst,
        sgst: tm.sgst,
      });
    }
  });

  const it = {
    _id: item._id,
    purchase_type: item.purchase_type,
    purchase_type_name,
    purchase_date: item.purchase_date,
    bill_date: item.bill_date,
    account_id: item.account_id,
    account_name,
    bill_no: item.bill_no,
    gr_no: item.gr_no,
    gr_date: item.gr_date,
    transport_id: item.transport_id,
    transport_name,
    nob: item.nob,
    transactions: item.transactions,
    bill_amount: item.bill_amount,
    igst: item.igst,
    cgst: item.cgst,
    sgst: item.sgst,
    tcs: item.tcs,
    round_off: item.round_off,
    total_amount: item.total_amount,
    discount: item.discount,
    change_user_name,
    change_date,
    create_user_name,
    create_date,
    transactions: trn,
  };

  return it;
}

module.exports = router;
