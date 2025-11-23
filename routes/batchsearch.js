const express = require("express");
const router = express.Router();
const MaterialIssue = require("../models/MaterialIssue");

router.get("/", async (req, res) => {
  main_search = req.query.main_search;

  const filters = { "transactions.batch_no": main_search };

  const pipeLine = [
    { $match: filters },
    { $addFields: { transactions: { $filter: { input: "$transactions", as: "transaction", cond: { $eq: ["$$transaction.batch_no", main_search] } } } } },
    { $unwind: { path: "$transactions", preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: "products",
        localField: "transactions.product_id",
        foreignField: "_id",
        as: "product_info",
      },
    },
    { $unwind: { path: "$product_info", preserveNullAndEmptyArrays: true } },
    { $addFields: { "transactions.product_name": "$product_info.product_name" } },
    {
      $group: {
        _id: "$_id",
        transactions: { $push: "$transactions" },
        change_user_id: { $first: "$change_user_id" },
        create_user_id: { $first: "$create_user_id" },
        transaction_date: { $first: "$transaction_date" },
        transaction_type: { $first: "$transaction_type" },
        workshop_id: { $first: "$workshop_id" },
        to_workshop_id: { $first: "$to_workshop_id" },
      },
    },
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
    { $sort: { transaction_date: -1, _id: -1 } },
  ];

  const materialissue = await MaterialIssue.aggregate(pipeLine);

  const records = materialissue.map((itm) => {
    workshop_name = itm.workshop?.name || "";
    to_workshop_name = itm.toworkshop?.name || "";
    account_name = itm.account?.account_name || "";
    create_user_name = itm.createUser?.complete_name || "";
    change_user_name = itm.changeUser?.complete_name || "";

    return {
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
      transactions: itm.transactions,
    };
  });

  if (records.length == 0) return res.status(SUCCESS).send(addMarkup(1, "Search result", { search_result: [] }));
  else return res.status(SUCCESS).send(addMarkup(1, "Search result", { search_result: records }));
});

module.exports = router;
