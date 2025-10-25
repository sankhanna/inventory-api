const Joi = require("joi-oid");
const express = require("express");
const router = express.Router();
const Purchases = require("../models/Purchases");
const verifyID = require("../utils/verify");
const readFile = require("../utils/readFile");
const findAccountObj = require("../services/findAccountObj");
const { getDate, dynamicSort } = require("../utils/common-functions");
const filecontent = require("../utils/readFile");
const AccountsModel = require("../models/Accounts");
const mongoose = require("mongoose");

function purchase_validation_schema() {
  const schema = Joi.object({
    purchase_id: Joi.objectId().optional(),
    account_id: Joi.objectId().required(),
    gr_number: Joi.string().allow(""),
    transport_id: Joi.objectId().optional(),
    product_id: Joi.objectId().required(),
    purchase_date: Joi.date().raw().required(),
    bill_date: Joi.date().raw().required(),
    bill_no: Joi.string().optional(),
    mts: Joi.number().optional(),
    short: Joi.number().required(),
    nett_mts: Joi.number().required(),
    rate: Joi.number().required(),
    gross: Joi.number().required(),
    discount_rate: Joi.number().required(),
    discount: Joi.number().required(),
    overhead: Joi.number().required(),
    less: Joi.number().required(),
    igst: Joi.number().required(),
    cgst: Joi.number().required(),
    sgst: Joi.number().required(),
    round: Joi.number().required(),
    purchase_amount: Joi.number().required(),
    favour_id: Joi.string().required(),
    grace_days: Joi.number().required(),
    goods_return: Joi.number().required(),
    goods_return_date: Joi.string().allow(""),
    goods_return_summary: Joi.string().allow(""),
  });

  return schema;
}

router.get("/", async (req, res) => {
  const accounts = await AccountsModel.find({});

  filter_product_id = req.query.filter_product_id;
  filter_account_id = req.query.filter_account_id;
  filter_agent_id = req.query.filter_agent_id;
  start_date = req.query.start_date;
  end_date = req.query.end_date;
  purchase_start_date = req.query.purchase_start_date;
  purchase_end_date = req.query.purchase_end_date;
  filter_favour_id = req.query.filter_favour_id;
  hide_already_dispatched = req.query.hide_already_dispatched;
  dispatch_date = req.query.dispatch_date;
  hide_goods_return = req.query.hide_goods_return;
  sort_by = req.query.sort_by;

  let filter = {};
  let records = [];
  let accountIds = [];
  if (filter_account_id != "" && filter_account_id != "null") {
    accountIds.push(filter_account_id);
  }

  if (filter_agent_id != "" && filter_agent_id != "null") {
    const agentCustomer = accounts.filter((item) => JSON.stringify(item.agent_id) == JSON.stringify(filter_agent_id));
    agentCustomer.map((customer) => accountIds.push(customer._id.toString()));
  }

  if (filter_product_id != "" && filter_account_id != "null") filter = { ...filter, product_id: new mongoose.Types.ObjectId(filter_product_id) };
  if (filter_favour_id != "" && filter_favour_id != "null") filter = { ...filter, favour_id: filter_favour_id };
  if (hide_already_dispatched == "1") filter = { ...filter, dispatched: false };
  if (hide_goods_return == "1") filter = { ...filter, $or: [{ goods_return: false }, { goods_return: { $exists: false } }] };

  if (start_date != "" && end_date != "") {
    let date_filter = { bill_date: { $gte: new Date(start_date), $lte: new Date(end_date) } };
    filter = { ...filter, ...date_filter };
  }

  if (purchase_start_date != "" && purchase_end_date != "") {
    let date_filter = { purchase_date: { $gte: new Date(purchase_start_date), $lte: new Date(purchase_end_date) } };
    filter = { ...filter, ...date_filter };
  }

  if (dispatch_date != "") {
    let date_filter = { dispatched_date: { $gte: new Date(dispatch_date), $lte: new Date(dispatch_date) } };
    filter = { ...filter, ...date_filter };
  }

  if (accountIds.length > 0) {
    filter = { ...filter, account_id: { $in: accountIds.map((account) => new mongoose.Types.ObjectId(account)) } };
  }

  const pipeline = [
    { $match: filter },
    { $lookup: { from: "accounts", localField: "account_id", foreignField: "_id", as: "account" } },
    { $lookup: { from: "transports", localField: "transport_id", foreignField: "_id", as: "transport" } },
    { $lookup: { from: "products", localField: "product_id", foreignField: "_id", as: "product" } },
    { $lookup: { from: "agents", localField: "account.agent_id", foreignField: "_id", as: "agent" } },
    { $lookup: { from: "users", localField: "change_user_id", foreignField: "id", as: "changeUser" } },
    { $lookup: { from: "users", localField: "create_user_id", foreignField: "id", as: "createUser" } },
    { $unwind: { path: "$account", preserveNullAndEmptyArrays: true } },
    { $unwind: { path: "$transport", preserveNullAndEmptyArrays: true } },
    { $unwind: { path: "$product", preserveNullAndEmptyArrays: true } },
    { $unwind: { path: "$changeUser", preserveNullAndEmptyArrays: true } },
    { $unwind: { path: "$createUser", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        bill_no: 1,
        bill_date: 1,
        purchase_date: 1,
        purchase_amount: 1,
        nett_mts: 1,
        mts: 1,
        rate: 1,
        igst: 1,
        cgst: 1,
        sgst: 1,
        goods_return: 1,
        goods_return_date: 1,
        goods_return_summary: 1,
        favour_id: 1,
        gr_number: 1,
        discount_rate: 1,
        discount: 1,
        dispatched: 1,
        dispatched_date: 1,
        received: 1,
        received_date: 1,
        create_user_id: 1,
        change_user_id: 1,
        create_date: 1,
        change_date: 1,
        account_id: 1,
        transport_id: 1,
        product_id: 1,
        gross: 1,
        overhead: 1,
        less: 1,
        round: 1,
        grace_days: 1,
        "account.account_name": 1,
        "transport.transport_name": 1,
        "product.product_name": 1,
        "agent.agent_name": 1,
        "createUser.complete_name": 1,
        "changeUser.complete_name": 1,
      },
    },
    { $sort: { bill_date: 1 } },
  ];

  let purchases = await Purchases.aggregate(pipeline);

  if (hide_goods_return == "1") {
    records = [];
    records = purchases.filter((item) => item.goods_return == false || item.goods_return == undefined);
    purchases = records;
  }

  records = [];

  for (let counter = 0; counter < purchases.length; counter++) {
    const item = purchases[counter];

    let agentName = "";
    if (item.agent.length) agentName = item.agent[0].agent_name;

    const nitem = formatPurchase(item, item.transport?.transport_name, item.account.account_name, agentName, item.product.product_name, item.changeUser?.complete_name, item.change_date, item.createUser?.complete_name, item.create_date);
    records.push(nitem);
  }

  if (sort_by == "purchase_date") records.sort(dynamicSort("purchase_date"));
  else records.sort(dynamicSort("bill_date"));

  if (records.length == 0) return res.status(SUCCESS).send(addMarkup(1, "No purchases Found", { purchases: [] }));
  else return res.status(SUCCESS).send(addMarkup(1, "purchases Obtained Successfully", { purchases: records }));
});

router.get("/transitPurchase", async (req, res) => {
  let filter_account_id = req.query.filter_account_id;
  let filter_product_id = req.query.filter_product_id;
  let filter_favour_id = req.query.filter_favour_id;
  let dispatch_date = req.query.dispatch_date;
  let hide_already_received = req.query.hide_already_received;

  let filter = { dispatched: true };
  let records = [];

  if (filter_account_id != "null" && filter_account_id != "") filter = { ...filter, account_id: new mongoose.Types.ObjectId(filter_account_id) };
  if (filter_product_id != "null" && filter_product_id != "") filter = { ...filter, product_id: new mongoose.Types.ObjectId(filter_product_id) };
  if (filter_favour_id != "null" && filter_favour_id != "") filter = { ...filter, favour_id: filter_favour_id };
  if (hide_already_received == "1") filter = { ...filter, received: false };

  const pipeline = [
    { $match: filter },
    { $lookup: { from: "accounts", localField: "account_id", foreignField: "_id", as: "account" } },
    { $lookup: { from: "transports", localField: "transport_id", foreignField: "_id", as: "transport" } },
    { $lookup: { from: "products", localField: "product_id", foreignField: "_id", as: "product" } },
    { $lookup: { from: "users", localField: "change_user_id", foreignField: "id", as: "changeUser" } },
    { $lookup: { from: "users", localField: "create_user_id", foreignField: "id", as: "createUser" } },
    { $unwind: { path: "$account", preserveNullAndEmptyArrays: true } },
    { $unwind: { path: "$transport", preserveNullAndEmptyArrays: true } },
    { $unwind: { path: "$product", preserveNullAndEmptyArrays: true } },
    { $unwind: { path: "$changeUser", preserveNullAndEmptyArrays: true } },
    { $unwind: { path: "$createUser", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        bill_no: 1,
        bill_date: 1,
        purchase_date: 1,
        purchase_amount: 1,
        nett_mts: 1,
        mts: 1,
        rate: 1,
        igst: 1,
        cgst: 1,
        sgst: 1,
        goods_return: 1,
        goods_return_date: 1,
        goods_return_summary: 1,
        favour_id: 1,
        gr_number: 1,
        discount_rate: 1,
        discount: 1,
        dispatched: 1,
        dispatched_date: 1,
        received: 1,
        received_date: 1,
        create_user_id: 1,
        change_user_id: 1,
        create_date: 1,
        change_date: 1,
        account_id: 1,
        transport_id: 1,
        product_id: 1,
        gross: 1,
        overhead: 1,
        less: 1,
        round: 1,
        grace_days: 1,
        "account.account_name": 1,
        "transport.transport_name": 1,
        "product.product_name": 1,
        "createUser.complete_name": 1,
        "changeUser.complete_name": 1,
      },
    },
    { $sort: { dispatch_date: 1 } },
  ];

  let purchases = await Purchases.aggregate(pipeline);

  if (dispatch_date != "") {
    records = [];
    records = purchases.filter((item) => Date.parse(item.dispatched_date));
    purchases = records;

    records = [];
    records = purchases.filter((item) => {
      return Date.parse(item.dispatched_date) == Date.parse(dispatch_date);
    });
    purchases = records;
  }

  records = [];
  records = purchases.map((item) => {
    return formatPurchase(item, item.transport.transport_name, item.account.account_name, "", item.product.product_name, item.changeUser?.complete_name, item.change_date, item.createUser?.complete_name, item.create_date);
  });

  if (records.length == 0) return res.status(SUCCESS).send(addMarkup(1, "No purchases Found", { purchases: [] }));
  else return res.status(SUCCESS).send(addMarkup(1, "purchases Obtained Successfully", { purchases: records }));
});

router.get("/purchaseDetail/:id", async (req, res) => {
  if (verifyID(req.params.id) == false) return res.status(BADREQUEST).json(addMarkup(0, "invalid purchase id provided", { purchase: {} }));

  const purchase = await Purchases.findOne({ _id: req.params.id });
  if (purchase == null) return res.status(BADREQUEST).send(addMarkup(0, "purchase not found", { purchase: {} }));

  return res.status(SUCCESS).send(addMarkup(1, "Accounts Obtained Successfully", { purchase: purchase }));
});

router.post("/", async (req, res) => {
  const schema = purchase_validation_schema();

  const result = schema.validate(req.body);
  if (result.error != null) {
    return res.status(BADREQUEST).send(addMarkup(0, result.error.message, {}));
  }

  let duplicate_found = false;
  let duplicate_found1 = false;
  const account_purchase = await Purchases.find({ account_id: result.value.account_id });
  account_purchase.map((item) => {
    db_bill_date = getDate(item.bill_date);
    if (formString(result.value.purchase_id) == "") {
      if (item.gr_number.toLowerCase() == result.value.gr_number.toLowerCase()) {
        duplicate_found = true;
      }
      if (item.bill_no.toLowerCase() == result.value.bill_no.toLowerCase() && db_bill_date == result.value.bill_date) {
        duplicate_found1 = true;
      }
    } else {
      if (item.gr_number.toLowerCase() == result.value.gr_number.toLowerCase() && CO(result.value.purchase_id) != CO(item._id)) {
        duplicate_found = true;
      }
      if (item.bill_no.toLowerCase() == result.value.bill_no.toLowerCase() && db_bill_date == result.value.bill_date && CO(result.value.purchase_id) != CO(item._id)) {
        duplicate_found1 = true;
      }
    }
  });

  if (duplicate_found) return res.status(BADREQUEST).send(addMarkup(0, "There is already a invoice with same GR Number", {}));
  if (duplicate_found1) return res.status(BADREQUEST).send(addMarkup(0, "There is already a invoice with same Bill number & Bill date ", {}));

  let purchase = null;
  if (result.value.purchase_id == null) {
    purchase = new Purchases({
      account_id: result.value.account_id,
      gr_number: result.value.gr_number,
      transport_id: result.value.transport_id,
      product_id: result.value.product_id,
      purchase_date: result.value.purchase_date,
      bill_date: result.value.bill_date,
      bill_no: result.value.bill_no,
      mts: result.value.mts,
      short: result.value.short,
      nett_mts: result.value.nett_mts,
      rate: result.value.rate,
      gross: result.value.gross,
      discount_rate: result.value.discount_rate,
      discount: result.value.discount,
      overhead: result.value.overhead,
      less: result.value.less,
      igst: result.value.igst,
      cgst: result.value.cgst,
      sgst: result.value.sgst,
      round: result.value.round,
      purchase_amount: result.value.purchase_amount,
      favour_id: result.value.favour_id,
      create_date: new Date(),
      change_date: new Date(),
      create_user_id: req.headers.user_id,
      change_user_id: req.headers.user_id,
      grace_days: result.value.grace_days,
    });

    if (parseInt(result.value.goods_return) == 1) {
      purchase.goods_return = true;
      purchase.goods_return_date = result.value.goods_return_date;
      purchase.goods_return_summary = result.value.goods_return_summary;
    } else {
      purchase.goods_return = false;
      purchase.goods_return_date = "";
      purchase.goods_return_summary = result.value.goods_return_summary;
    }
  } else {
    purchase = await Purchases.findById({ _id: result.value.purchase_id });

    purchase.account_id = result.value.account_id;
    purchase.gr_number = result.value.gr_number;
    purchase.transport_id = result.value.transport_id;
    purchase.product_id = result.value.product_id;
    purchase.purchase_date = result.value.purchase_date;
    purchase.bill_date = result.value.bill_date;
    purchase.bill_no = result.value.bill_no;
    purchase.mts = result.value.mts;
    purchase.short = result.value.short;
    purchase.nett_mts = result.value.nett_mts;
    purchase.rate = result.value.rate;
    purchase.gross = result.value.gross;
    purchase.discount_rate = result.value.discount_rate;
    purchase.discount = result.value.discount;
    purchase.overhead = result.value.overhead;
    purchase.less = result.value.less;
    purchase.igst = result.value.igst;
    purchase.cgst = result.value.cgst;
    purchase.sgst = result.value.sgst;
    purchase.round = result.value.round;
    purchase.purchase_amount = result.value.purchase_amount;
    purchase.favour_id = result.value.favour_id;
    (purchase.change_date = new Date()), (purchase.change_user_id = req.headers.user_id);
    purchase.grace_days = result.value.grace_days;

    if (parseInt(result.value.goods_return) == 1) {
      purchase.goods_return = true;
      purchase.goods_return_date = result.value.goods_return_date;
      purchase.goods_return_summary = result.value.goods_return_summary;
    } else {
      purchase.goods_return = false;
      purchase.goods_return_date = "";
      purchase.goods_return_summary = result.value.goods_return_summary;
    }
  }
  let saveResult = await purchase.save();

  if (saveResult) {
    return res.status(SUCCESS).send(addMarkup(1, "Purchase saved successfully", { purchase: saveResult }));
  } else {
    return res.status(BADREQUEST).send(addMarkup(0, "Could not save purchase", { purchase: {} }));
  }
});

router.put("/updateDispatch", async (req, res) => {
  const purchase = await Purchases.findById({ _id: req.body.purchase_id });

  if (req.body.dispatched_date == "") {
    purchase.dispatched = false;
    purchase.dispatched_date = null;
  } else {
    purchase.dispatched = true;
    purchase.dispatched_date = req.body.dispatched_date;
  }

  const saveResult = purchase.save();

  return res.status(SUCCESS).send(addMarkup(1, "Dispatch Detail updated successfully", { purchase: saveResult }));
});

router.put("/updateReceived", async (req, res) => {
  const purchase = await Purchases.findById({ _id: req.body.purchase_id });

  if (req.body.received_date == "") {
    purchase.received = false;
    purchase.received_date = null;
  } else {
    purchase.received = true;
    purchase.received_date = req.body.received_date;
  }
  const saveResult = purchase.save();

  return res.status(SUCCESS).send(addMarkup(1, "Received Detail updated successfully", { purchase: saveResult }));
});

function formatPurchase(item, transport_name, account_name, agent_name, product_name, change_user_name, change_date, create_user_name, create_date) {
  const grace_days = item.grace_days == undefined ? 0 : item.grace_days;

  const it = { ...item, grace_days };
  const nitem = { ...{ transport_name, account_name, agent_name, product_name, change_user_name, change_date, create_user_name, create_date }, ...it };
  return nitem;
}

module.exports = router;
