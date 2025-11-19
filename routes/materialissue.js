const Joi = require("joi-oid");
const express = require("express");
const router = express.Router();
const MaterialIssue = require("../models/MaterialIssue");
const MaterialReceipts = require("../models/MaterialReceipts");
const verifyID = require("../utils/verify");
const WorkshopsModel = require("../models/Workshops");
const Accounts = require("../models/Accounts");
const Products = require("../models/Product");
const findAccountName = require("../services/findAccountName");
const findProductName = require("../services/findProductName");
const findWorkshopName = require("../services/findWorkshopName");
const UserModel = require("../models/Users");
const findUserName = require("../services/findUserName");

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
  const accounts = await Accounts.find();
  const products = await Products.find();
  const workshops = await WorkshopsModel.find({}).sort({ _id: 1 });
  const materialissue = await MaterialIssue.find().sort({ transaction_date: -1 });
  const users = await UserModel.find();

  let records = [];
  records = materialissue.map((item) => {
    account_name = findAccountName(accounts, item.account_id);
    workshop_name = findWorkshopName(workshops, item.workshop_id);
    to_workshop_name = findWorkshopName(workshops, item.to_workshop_id);

    change_user_name = findUserName(users, item.change_user_id);
    create_user_name = findUserName(users, item.create_user_id);

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

  // transactions = [];
  // for ( counter = 0; counter < mi.transactions.length; counter++){
  //     ref_detail = "";
  //     ref_tran_date = "";
  //     const mr = await find_reference(mi.transactions[counter].material_receipt_ref_id);
  //     mr.map((it) => {
  //         ref_tran_date = it.transaction_date;
  //         let transactions = it.transactions;
  //         transactions.map((item) => {
  //             if ( JSON.stringify(item._id) == JSON.stringify(mi.transactions[counter].material_receipt_ref_id)){
  //                 ref_detail = item.batch_no;
  //             }
  //         });
  //     })
  //     const newTran =  { ...{ref_detail} , ...{ref_tran_date} , ...{ _id: mi.transactions[counter]._id ,
  //         material_receipt_ref_id: mi.transactions[counter].material_receipt_ref_id ,
  //         product_id: mi.transactions[counter].product_id ,
  //         qty: mi.transactions[counter].qty ,
  //         short: mi.transactions[counter].short ,
  //         nett_qty: mi.transactions[counter].nett_qty ,
  //         rate: mi.transactions[counter].rate ,
  //         value: mi.transactions[counter].value ,
  //         batch_no: mi.transactions[counter].batch_no ,
  //         pcs: mi.transactions[counter].pcs
  //     } };
  //     transactions.push(newTran);
  // }
  // let returnObj = { _id: mi._id , workshop_id: mi.workshop_id , to_workshop_id: mi.to_workshop_id ,
  //         transaction_date: mi.transaction_date , transaction_type: mi.transaction_type , create_date: mi.create_date ,
  //         change_date: mi.change_date , create_user_id: mi.create_user_id , change_user_id: mi.change_user_id , transactions: transactions };
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

  error_found = false;
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

    xtransactions = [];
    transactions = result.value.transactions;
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

    transactions = result.value.transactions;
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

    for (counter = 0; counter < materialissue.transactions.length; counter++) {
      transactions = result.value.transactions;
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
  trn = [];
  transactions = item.transactions;
  trn = transactions.map((tm) => {
    product_name = findProductName(products, tm.product_id);
    return { material_receipt_ref_id: tm.material_receipt_ref_id, product_id: tm.product_id, product_name, pcs: tm.pcs, qty: tm.qty, short: tm.short, nett_qty: tm.nett_qty, value: tm.value };
  });

  const it = { _id: item._id, workshop_id: item.workshop_id, to_workshop_id: item.to_workshop_id, transaction_type: item.transaction_type, account_id: item.account_id, transaction_date: item.transaction_date, transactions: item.transactions };
  const nitem = { ...{ workshop_name, to_workshop_name, account_name, change_user_name, change_date, create_user_name, create_date }, ...it, transactions: trn };

  return nitem;
}

module.exports = router;
