const express = require("express");
const router = express.Router();
const Accounts = require("../models/Accounts");
const Products = require("../models/Product");
const findAccountName = require("../services/findAccountName");
const findWorkshopName = require("../services/findWorkshopName");
const findProductName = require("../services/findProductName");
const MaterialIssue = require("../models/MaterialIssue");
const WorkshopsModel = require("../models/Workshops");
const UserModel = require("../models/Users");
const findUserName = require("../services/findUserName");

router.get("/", async (req, res) => {
  main_search = req.query.main_search;

  const accounts = await Accounts.find();
  const products = await Products.find();
  const workshops = await WorkshopsModel.find({}).sort({ _id: 1 });
  let materialissue = await MaterialIssue.find({ $or: [{ "transactions.batch_no": main_search }] });
  const users = await UserModel.find();

  let records = [];
  records = materialissue.map((itm) => {
    workshop_name = findWorkshopName(workshops, itm.workshop_id);
    to_workshop_name = findWorkshopName(workshops, itm.to_workshop_id);
    account_name = findAccountName(accounts, itm.account_id);

    change_user_name = findUserName(users, itm.change_user_id);
    create_user_name = findUserName(users, itm.create_user_id);

    obj = {
      _id: itm._id,
      workshop_id: itm.workshop_id,
      workshop_name,
      to_workshop_id: itm.to_workshop_id,
      to_workshop_name,
      transaction_date: itm.transaction_date,
      transaction_type: itm.transaction_type,
      create_date: itm.create_date,
      change_date: itm.change_date,
      create_user_id: itm.create_user_id,
      change_user_id: itm.change_user_id,
      account_name,
      change_user_name,
      create_user_name,
      transactions: [],
    };

    trn = [];
    itm.transactions.map((item) => {
      if (item.batch_no == main_search) {
        product_name = findProductName(products, item.product_id);

        trn.push({
          _id: item._id,
          product_name,
          product_id: item.product_id,
          pcs: item.pcs,
          qty: item.qty,
          short: item.short,
          nett_qty: item.nett_qty,
          value: item.value,
          batch_no: item.batch_no,
          material_receipt_ref_id: item.material_receipt_ref_id,
          material_receipt_ref_str: item.material_receipt_ref_str,
        });
      }
    });
    obj.transactions = trn;

    return obj;
  });

  if (records.length == 0) return res.status(SUCCESS).send(addMarkup(1, "Search result", { search_result: [] }));
  else return res.status(SUCCESS).send(addMarkup(1, "Search result", { search_result: records }));
});

module.exports = router;
