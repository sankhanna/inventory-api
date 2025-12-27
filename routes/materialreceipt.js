const Joi = require("joi-oid");
const express = require("express");
const router = express.Router();
const MaterialReceipts = require("../models/MaterialReceipts");
const MaterialIssue = require("../models/MaterialIssue");
const verifyID = require("../utils/verify");
const Products = require("../models/Product");
const findProductName = require("../services/findProductName");
const mongoose = require("mongoose");

function validationSchemaMaterialReceipt() {
  const transaction = Joi.object().keys({
    row_record_id: Joi.objectId().optional(),
    product_id: Joi.objectId().required(),
    qty: Joi.number().required(),
    short: Joi.number().required(),
    nett_qty: Joi.number().required(),
    rate: Joi.number().required(),
    value: Joi.number().required(),
    batch_no: Joi.string().required(),
  });

  const schema = Joi.object({
    material_receipt_id: Joi.objectId().optional(),
    workshop_id: Joi.number().required(),
    transaction_type: Joi.string().valid("O", "T"),
    transaction_date: Joi.date().raw().required(),
    account_id: Joi.objectId().optional(),
    transactions: Joi.array().items(transaction),
  });
  return schema;
}

router.get("/", async (req, res) => {
  const products = await Products.find();

  const startDate = req.query.startDate || "01-Jan-1970";
  const endDate = req.query.endDate || "31-Dec-2100";

  const pipeLine = [
    { $match: { transaction_date: { $gte: new Date(startDate), $lte: new Date(endDate) } } },
    { $lookup: { from: "accounts", localField: "account_id", foreignField: "_id", as: "account" } },
    { $lookup: { from: "workshops", localField: "workshop_id", foreignField: "_id", as: "workshop" } },
    { $lookup: { from: "users", localField: "change_user_id", foreignField: "id", as: "changeUser" } },
    { $lookup: { from: "users", localField: "create_user_id", foreignField: "id", as: "createUser" } },
    { $unwind: { path: "$account", preserveNullAndEmptyArrays: true } },
    { $unwind: { path: "$workshop", preserveNullAndEmptyArrays: true } },
    { $unwind: { path: "$changeUser", preserveNullAndEmptyArrays: true } },
    { $unwind: { path: "$createUser", preserveNullAndEmptyArrays: true } },
    { $project: { product_info: 0 } },
    { $sort: { _id: -1 } },
  ];

  const materialreceipt = await MaterialReceipts.aggregate(pipeLine);

  const records = materialreceipt.map((item) => {
    const workshop_name = item.workshop?.name || "";
    const account_name = item.account?.account_name || "";
    const create_user_name = item.createUser?.complete_name || "";
    const change_user_name = item.changeUser?.complete_name || "";

    const nitem = formatMaterialReceiptRow(item, workshop_name, account_name, products, change_user_name, item.change_date, create_user_name, item.create_date);
    return nitem;
  });

  return res.status(SUCCESS).send(addMarkup(1, "material receipt Obtained Successfully", { materialreceipts: records }));
});

router.get("/MaterialReceiptDetail/:id", async (req, res) => {
  if (verifyID(req.params.id) == false) return res.status(BADREQUEST).json(addMarkup(0, "invalid id provided", { materialreceipt: {} }));

  const materialreceipt = await MaterialReceipts.findOne({ _id: req.params.id });
  if (materialreceipt == null) return res.status(BADREQUEST).send(addMarkup(0, "entry not found", { materialreceipt: {} }));

  return res.status(SUCCESS).send(addMarkup(1, "material receipt entry Obtained Successfully", { materialreceipt: materialreceipt }));
});

router.get("/PendingMaterialReceipt/:productID/:wareHouse", async (req, res) => {
  if (verifyID(req.params.productID) == false) return res.status(BADREQUEST).json(addMarkup(0, "invalid id provided", { materialreceipts: [] }));

  const records = await MaterialReceipts.aggregate([
    {
      $match: {
        workshop_id: Number(req.params.wareHouse), // pass your workshop_id here
      },
    },
    {
      $unwind: "$transactions",
    },
    {
      $match: {
        "transactions.product_id": new mongoose.Types.ObjectId(req.params.productID),
      },
    },
    {
      $lookup: {
        from: "materialissues",
        let: {
          receipt_transaction_id: "$transactions._id",
        },
        pipeline: [
          {
            $unwind: "$transactions",
          },
          {
            $match: {
              $expr: {
                $eq: ["$transactions.material_receipt_ref_id", "$$receipt_transaction_id"],
              },
            },
          },
          {
            $group: {
              _id: "$transactions.material_receipt_ref_id",
              total_issued_qty: { $sum: "$transactions.qty" },
            },
          },
        ],
        as: "issued_data",
      },
    },
    {
      $project: {
        _id: "$transactions._id",
        product_id: "$transactions.product_id",
        transaction_date: "$transaction_date",
        batch_no: "$transactions.batch_no",
        nett_qty: "$transactions.nett_qty",
        already_issued: {
          $ifNull: [{ $arrayElemAt: ["$issued_data.total_issued_qty", 0] }, 0],
        },
        value: "$transactions.value",
      },
    },
    {
      $addFields: {
        balance: {
          $subtract: ["$nett_qty", "$already_issued"],
        },
      },
    },
    {
      $match: {
        balance: { $gt: 0 },
      },
    },
    {
      $sort: {
        transaction_date: 1,
      },
    },
  ]);

  return res.status(SUCCESS).send(addMarkup(1, "material receipt entry Obtained", { materialreceipts: records }));
});

router.post("/", async (req, res) => {
  const schema = validationSchemaMaterialReceipt();

  const result = schema.validate(req.body);
  if (result.error != null) {
    return res.status(BADREQUEST).send(addMarkup(0, result.error.message, {}));
  }

  let materialreceipt = null;
  if (result.value.material_receipt_id == null) {
    materialreceipt = new MaterialReceipts({
      workshop_id: result.value.workshop_id,
      transaction_date: result.value.transaction_date,
      account_id: result.value.account_id,
      transaction_type: result.value.transaction_type,
      create_date: new Date(),
      change_date: new Date(),
      create_user_id: req.headers.user_id,
      change_user_id: req.headers.user_id,
    });

    
    let transactions = result.value.transactions;
    const xtransactions = transactions.map((item) => {
      return { product_id: item.product_id, qty: item.qty, short: item.short, nett_qty: item.nett_qty, rate: item.rate, value: item.value, batch_no: item.batch_no };
    });
    materialreceipt.transactions = xtransactions;
  } else {
    materialreceipt = await MaterialReceipts.findById({ _id: result.value.material_receipt_id });

    materialreceipt.change_date = new Date();
    materialreceipt.change_user_id = req.headers.user_id;
    materialreceipt.transaction_type = result.value.transaction_type;
    materialreceipt.transaction_date = result.value.transaction_date;
    materialreceipt.account_id = result.value.account_id;
    materialreceipt.workshop_id = result.value.workshop_id;

    let transactions = result.value.transactions;
    transactions.map((item) => {
      if (item.row_record_id == undefined) {
        materialreceipt.transactions.push({ product_id: item.product_id, qty: item.qty, short: item.short, nett_qty: item.nett_qty, rate: item.rate, value: item.value, batch_no: item.batch_no });
      }
    });

    for (let counter = 0; counter < materialreceipt.transactions.length; counter++) {
      let transactions = result.value.transactions;
      transactions.map((item) => {
        if (item.row_record_id != null) {
          if (JSON.stringify(item.row_record_id) == JSON.stringify(materialreceipt.transactions[counter]._id)) {
            materialreceipt.transactions[counter].product_id = item.product_id;
            materialreceipt.transactions[counter].qty = item.qty;
            materialreceipt.transactions[counter].short = item.short;
            materialreceipt.transactions[counter].nett_qty = item.nett_qty;
            materialreceipt.transactions[counter].rate = item.rate;
            materialreceipt.transactions[counter].value = item.value;
            materialreceipt.transactions[counter].batch_no = item.batch_no;
          }
        }
      });
    }
  }
  const saveResult = await materialreceipt.save();

  if (saveResult) {
    return res.status(SUCCESS).send(addMarkup(1, "Entry saved successfully", { materialreceipt: saveResult }));
  } else {
    return res.status(BADREQUEST).send(addMarkup(0, "Could not save material receipt", { materialreceipt: {} }));
  }
});

//to manually run and check the stock
router.get("/CheckMaterialReceiptIssue", async (req, res) => {
  const products = await Products.find();
  const materialreceipt = await MaterialReceipts.find({ workshop_id: 10 });
  const materialissue = await MaterialIssue.find();

  const all_records = materialreceipt.map((item) => {
    let transactions = item.transactions;
    transactions.map((itm) => {
      all_records.push({ _id: itm._id, product_id: itm.product_id, transaction_date: item.transaction_date, batch_no: itm.batch_no, nett_qty: itm.nett_qty, already_issued: 0, balance: itm.nett_qty, value: itm.value });
    });
  });

  const records = all_records.map((item) => {
    let total_issued = 0;
    materialissue.map((ite) => {
      const transactions = ite.transactions;
      transactions.map((itm) => {
        if (JSON.stringify(itm.material_receipt_ref_id) == JSON.stringify(item._id)) {
          total_issued += itm.nett_qty;
        }
      });
    });
    item.already_issued = total_issued;
    item.balance = item.nett_qty - item.already_issued;

    if (item.balance < 0) {
      console.log(findProductName(products, item.product_id));
      console.log(item.product_id);
      console.log(item.balance);
    }

    return item;
  });

  return res.status(SUCCESS).send(addMarkup(1, "material receipt entry Obtained", { materialreceipts: records }));
});

function formatMaterialReceiptRow(item, workshop_name, account_name, products, change_user_name, change_date, create_user_name, create_date) {
  let transactions = item.transactions;
  const trn = transactions.map((tm) => {
    const product_name = findProductName(products, tm.product_id);
    return { product_id: tm.product_id, product_name, qty: tm.qty, short: tm.short, nett_qty: tm.nett_qty, value: tm.value };
  });

  const it = { _id: item._id, workshop_id: item.workshop_id, transaction_type: item.transaction_type, account_id: item.account_id, transaction_date: item.transaction_date, transactions: trn };
  const nitem = { ...{ workshop_name, account_name, change_user_name, change_date, create_user_name, create_date }, ...it };

  return nitem;
}

module.exports = router;
