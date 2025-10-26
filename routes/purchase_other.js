const mongoose = require("mongoose");
const Joi = require("joi-oid");
const express = require("express");
const router = express.Router();
const PurchaseOtherModel = require("../models/Purchases_other");
const verifyID = require("../utils/verify");
const readFile = require("../utils/readFile");
const findUserName = require("../services/findUserName");


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

const _getPurchaseOtherPipeline = (filter) => {
  const pipeline = [
    { $match: filter },

    { $lookup: { from: "products", localField: "transactions.product_id", foreignField: "_id", as: "product_details" } },
    { $unwind: { path: "$product_info", preserveNullAndEmptyArrays: true } },

    { $lookup: { from: "accounts", localField: "account_id", foreignField: "_id", as: "account" } },
    { $lookup: { from: "accounts", localField: "purchase_type", foreignField: "_id", as: "purchasetype" } },
    { $lookup: { from: "transports", localField: "transport_id", foreignField: "_id", as: "transport" } },

    { $unwind: { path: "$account", preserveNullAndEmptyArrays: true } },
    { $unwind: { path: "$transport", preserveNullAndEmptyArrays: true } },
    { $unwind: { path: "$purchasetype", preserveNullAndEmptyArrays: true } },
    {
      $addFields: {
        transactions: {
          $map: {
            input: "$transactions",
            as: "transaction",
            in: {
              $mergeObjects: [
                "$$transaction",
                {
                  product_name: {
                    $arrayElemAt: [
                      "$product_details.product_name",
                      {
                        $indexOfArray: ["$product_details._id", "$$transaction.product_id"],
                      },
                    ],
                  },
                },
              ],
            },
          },
        },
      },
    },
    {
      $project: {
        purchase_type: 1,
        purchase_date: 1,
        bill_no: 1,
        bill_date: 1,
        gr_no: 1,
        gr_date: 1,
        nob: 1,
        transactions: 1,
        bill_amount: 1,
        igst: 1,
        cgst: 1,
        sgst: 1,
        total_amount: 1,
        discount: 1,
        tcs: 1,
        round_off: 1,
        create_user_id: 1,
        change_user_id: 1,
        create_date: 1,
        change_date: 1,
        "account.account_name": 1,
        "transport.transport_name": 1,
        "purchasetype.account_name": 1,
      },
    },
    { $sort: { purchase_date: -1 } },
  ];
  return pipeline;
};

router.get("/", async (req, res) => {
  let filter_purchase_type = req.query.filter_purchase_type;
  let filter_account_id = req.query.filter_account_id;
  let filter_department_id = req.query.filter_department_id;
  let start_date = req.query.start_date;
  let end_date = req.query.end_date;

  const users = JSON.parse(readFile("../presets/users.json"));

  let filter = {};
  if (filter_purchase_type != "") filter = { ...filter, purchase_type: new mongoose.Types.ObjectId(filter_purchase_type) };
  if (filter_account_id != "") filter = { ...filter, account_id: new mongoose.Types.ObjectId(filter_account_id) };
  if (filter_department_id != "") filter = { ...filter, "transactions.department_id": filter_department_id };

  if (start_date != "" && end_date != "") {
    const startDate = new Date(start_date);
    const endDate = new Date(end_date);
    endDate.setHours(23, 59, 59, 999);

    let date_filter = { purchase_date: { $gte: startDate, $lte: endDate } };
    filter = { ...filter, ...date_filter };
  }

  const pipeLine = _getPurchaseOtherPipeline(filter);
  let PurchaseOther = await PurchaseOtherModel.aggregate(pipeLine);

  records = [];
  records = PurchaseOther.map((item) => {
    change_user_name = findUserName(users, item.change_user_id);
    create_user_name = findUserName(users, item.create_user_id);

    const nitem = formatPurchaseOtherRow(item, item.purchasetype?.account_name, item.account?.account_name, item.transport?.transport_name, change_user_name, item.change_date, create_user_name, item.create_date, filter_department_id);

    return nitem;
  });

  return res.status(SUCCESS).send(addMarkup(1, "material issue Obtained Successfully", { PurchaseOthers: records }));
});

router.get("/:id", async (req, res) => {
  if (verifyID(req.params.id) == false) return res.status(BADREQUEST).json(addMarkup(0, "invalid id provided", { PurchaseOther: {} }));

  const users = JSON.parse(readFile("../presets/users.json"));

  const filter = { _id: new mongoose.Types.ObjectId(req.params.id) };
  const pipeLine = _getPurchaseOtherPipeline(filter);

  let item = await PurchaseOtherModel.aggregate(pipeLine);
  if (!item.length) return res.status(BADREQUEST).send(addMarkup(0, "entry not found", { PurchaseOther: {} }));

  change_user_name = findUserName(users, item.change_user_id);
  create_user_name = findUserName(users, item.create_user_id);

  const nitem = formatPurchaseOtherRow(item[0], item.purchasetype?.account_name, item.account?.account_name, item.transport?.transport_name, change_user_name, item.change_date, create_user_name, item.create_date, 0);
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
    PurchaseOther = await PurchaseOtherModel.findById({ _id: result.value.purchase_id });

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

function formatPurchaseOtherRow(item, purchase_type_name, account_name, transport_name, change_user_name, change_date, create_user_name, create_date, filter_department_id) {
  let trn = [];
  item.transactions.map((tm) => {
    if (filter_department_id != "") {
      if (tm.department_id == filter_department_id) {
        trn.push({ ...tm });
      }
    } else {
      trn.push({ ...tm });
    }
  });
  const it = { ...item, purchase_type_name, account_name, transport_name, change_user_name, change_date, create_user_name, create_date, transactions: trn };
  return it;
}

module.exports = router;
