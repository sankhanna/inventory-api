const express = require("express");
const router = express.Router();
const Purchases = require("../models/Purchases");
const Products = require("../models/Product");
const findProduct = require("../services/findProduct");
const MaterialReceipts = require("../models/MaterialReceipts");
const MaterialIssue = require("../models/MaterialIssue");

router.get("/checkStockWI", async (req, res) => {
  const materialreceipt = await MaterialReceipts.find();
  const materialissue = await MaterialIssue.find({ workshop_id: 10 });

  without_reference = [];
  materialissue.map((item) => {
    transactions = item.transactions;
    workshop_id = item.workshop_id;
    transactions.map((row) => {
      current_product_id = row.product_id;
      current_record_id = row._id;
      nett_qty = row.nett_qty;
      material_receipt_ref_id = row.material_receipt_ref_id;

      materialreceipt.map((item) => {
        trans = item.transactions;
        trans.map((mrrow) => {
          if (CO(mrrow._id) == CO(material_receipt_ref_id)) {
            if (CO(current_product_id) != CO(mrrow.product_id)) without_reference.push(row);
          }
        });
      });
    });
  });
  return res.status(SUCCESS).send(addMarkup(1, "All Searched.", { without_reference }));
});

router.get("/checkStock", async (req, res) => {
  const materialreceipt = await MaterialReceipts.find();
  const materialissue = await MaterialIssue.find();

  without_reference = [];
  materialreceipt.map((item) => {
    transactions = item.transactions;
    workshop_id = item.workshop_id;
    if (workshop_id == "10") {
      transactions.map((row) => {
        current_product_id = row.product_id;
        current_record_id = row._id;
        nett_qty = row.nett_qty;

        materialissue.map((item) => {
          trans = item.transactions;
          workshop_id = item.workshop_id;
          to_workshop_id = item.to_workshop_id;
          trans.map((row) => {
            if (CO(current_record_id) == CO(row.material_receipt_ref_id)) {
              nett_qty = nett_qty - row.nett_qty;
            }

            if (formString(row.material_receipt_ref_id) == "" && workshop_id == "10") {
              if (!without_reference.find((id) => CO(id) == CO(row._id))) without_reference.push(row._id);
            }
          });
        });

        if (nett_qty < 0) {
          //console.log("Error : " + current_record_id + ":" + current_product_id + " : " + nett_qty);
        }
      });
    }
  });
  return res.status(SUCCESS).send(addMarkup(1, "All Searched.", { without_reference }));
});

router.get("/getPendingStock", async (req, res) => {
  let products = [];

  if (formString(req.query.prefered) == "1") products = await Products.find({ product_group: "Grey", prefferd_product: true }).sort({ product_name: 1 });
  else products = await Products.find({ product_group: "Grey" }).sort({ product_name: 1 });

  const purchases_summary = await Purchases.aggregate([{ $group: { _id: { product_id: "$product_id" }, nett_mts_total: { $sum: "$nett_mts" }, purchase_amount_total: { $sum: "$purchase_amount" } } }]);

  const purchases = await Purchases.aggregate([{ $match: { dispatched: false, goods_return: false } }, { $group: { _id: "$product_id", sum: { $sum: "$nett_mts" } } }]);

  const materialReceipts = await MaterialReceipts.aggregate([
    { $unwind: "$transactions" },
    { $group: { _id: { workshop_id: "$workshop_id", product_id: "$transactions.product_id" }, total_nett_qty: { $sum: "$transactions.nett_qty" } } },
    { $project: { _id: 0, workshop_id: "$_id.workshop_id", product_id: "$_id.product_id", total_nett_qty: 1 } },
  ]);

  const materialIssues = await MaterialIssue.aggregate([
    { $unwind: "$transactions" },
    { $group: { _id: { workshop_id: "$workshop_id", to_workshop_id: "$to_workshop_id", product_id: "$transactions.product_id" }, total_nett_qty: { $sum: "$transactions.nett_qty" } } },
    { $project: { _id: 0, workshop_id: "$_id.workshop_id", to_workshop_id: "$_id.to_workshop_id", product_id: "$_id.product_id", total_nett_qty: 1 } },
  ]);

  let records = [];
  await Promise.all(
    products.map(async (itm) => {
      let current_product_id = itm._id;
      let product = findProduct(products, current_product_id);
      const transitPurchase = await Purchases.find({ dispatched: true, product_id: current_product_id });

      let avg_purchase_rate = findAvgPurchaseRate(purchases_summary, current_product_id);
      let obj = {
        _id: current_product_id,
        name: product.product_name,
        prefferd_product: product.prefferd_product,
        avg_purchase_rate: avg_purchase_rate,
        pending_purchase_qty: 0,
        transit_qty: 0,
        under_grey_warehouse: 0,
        under_processing: 0,
        under_job: 0,
        under_dispatch: 0,
      };
      purchases.map((item) => {
        if (CO(current_product_id) == CO(item._id)) {
          obj.pending_purchase_qty = item.sum;
        }
      });

      let transit_qty = 0;
      transitPurchase.map((purchase_item) => {
        if (purchase_item.received == false || purchase_item.received == undefined) transit_qty += purchase_item.nett_mts;
      });

      let under_grey_warehouse = 0;
      let under_processing = 0;
      let under_job = 0;
      let under_dispatch = 0;

      materialReceipts.map((item) => {
        if (CO(current_product_id) == CO(item.product_id)) {
          if (item.workshop_id == "10") {
            under_grey_warehouse += item.total_nett_qty;
          }
          if (item.workshop_id == "20") {
            under_processing += item.total_nett_qty;
          }
          if (item.workshop_id == "30") {
            under_job += item.total_nett_qty;
          }
          if (item.workshop_id == "40") {
            under_dispatch += item.total_nett_qty;
          }
        }
      });

      let total_issue = 0;

      materialIssues.map((row) => {
        let workshop_id = row.workshop_id;
        let to_workshop_id = row.to_workshop_id;

        if (CO(current_product_id) == CO(row.product_id)) {
          if (to_workshop_id == "10") under_grey_warehouse += row.total_nett_qty;
          if (to_workshop_id == "20") under_processing += row.total_nett_qty;
          if (to_workshop_id == "30") under_job += row.total_nett_qty;
          if (to_workshop_id == "40") under_dispatch += row.total_nett_qty;

          if (workshop_id == "10") {
            under_grey_warehouse -= row.total_nett_qty;
            total_issue += row.total_nett_qty;
          }
          if (workshop_id == "20") under_processing -= row.total_nett_qty;
          if (workshop_id == "30") under_job -= row.total_nett_qty;
          if (workshop_id == "40") under_dispatch -= row.total_nett_qty;
        }
      });

      obj.under_grey_warehouse = under_grey_warehouse;
      obj.under_processing = under_processing;
      obj.under_job = under_job;
      obj.transit_qty = transit_qty;
      obj.under_dispatch = under_dispatch;
      records.push(obj);
    })
  );

  if (records.length == 0) return res.status(SUCCESS).send(addMarkup(1, "No purchases Found", { pending_stock: [] }));
  else return res.status(SUCCESS).send(addMarkup(1, "Purchases Obtained Successfully", { pending_stock: records }));
});

function findAvgPurchaseRate(purchases_summary, current_product_id) {
  let avg_rate = 0;
  purchases_summary.map((item) => {
    if (CO(item._id.product_id) == CO(current_product_id)) {
      avg_rate = item.purchase_amount_total / item.nett_mts_total;
    }
  });
  return avg_rate;
}

module.exports = router;
