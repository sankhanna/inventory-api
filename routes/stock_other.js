const express = require("express");
const moment = require("moment");
const router = express.Router();
const MIO = require("../models/MaterialIssueothers");
const Purchases_other = require("../models/Purchases_other");
const OpeningStock = require("../models/OpeningStock");
const Products = require("../models/Product");
const Loadworkshops = require("../services/productionworkshops");
const findWorkshopName = require("../services/findWorkshopName");
const mongoose = require("mongoose");
const MaterialIssueothers = require("../models/MaterialIssueothers");
const convertDateToISO = require("../utils/convert-date-iso");

async function findstock(current_product_id, workshop_id, as_on_date) {
  let qty = 0;
  let lpp = 0;
  if (as_on_date == null || as_on_date == undefined || as_on_date == "") {
    as_on_date = new Date("31-Dec-9999");
  } else {
    as_on_date = new Date(as_on_date);
  }

  const openingstock = await OpeningStock.find({ product_id: current_product_id });

  openingstock.map((item) => {
    qty += item.qty;
    lpp = item.rate;
  });

  let allPurchases = await Purchases_other.aggregate([
    {
      $match: {
        purchase_date: { $lte: moment(as_on_date).endOf("day").toDate() },
        purchase_date: { $gte: moment("2024-07-31T18:29:59.000Z").endOf("day").toDate() },
      },
    },
    {
      $unwind: "$transactions",
    },
    {
      $match: {
        "transactions.product_id": { $eq: new mongoose.Types.ObjectId(current_product_id) },
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: "$transactions.qty" },
      },
    },
  ]);

  allPurchases.map((item) => {
    qty += item.total;
  });

  const lastPurchase = await Purchases_other.find({
    transactions: { $elemMatch: { product_id: current_product_id } },
    purchase_date: { $lte: moment(as_on_date).endOf("day").toDate() },
    purchase_date: { $gte: moment("2024-07-31T18:29:59.000Z").endOf("day").toDate() },
  })
    .sort({ purchase_date: -1 })
    .limit(1);

  lastPurchase.map((item) => {
    item.transactions.map((tem) => {
      if (tem.product_id.equals(current_product_id)) {
        lpp = parseFloat((tem.value + tem.igst + tem.cgst + tem.sgst) / tem.qty).toFixed(2);
      }
    });
  });

  // if ( parseInt(workshop_id) > 0 ) {
  //     MIO.map((item) =>{
  //         const transaction_date = new Date(item.transaction_date);
  //         if ( transaction_date <= as_on_date && item.to_workshop_id == workshop_id ){
  //             item.transactions.map((tem) => {
  //                 if ( JSON.stringify(current_product_id) == JSON.stringify(tem.product_id) ){ qty += tem.qty; }
  //             });
  //         }
  //     });
  // }

  let allIssues = await MIO.aggregate([
    {
      $match: {
        transaction_date: { $lte: moment(as_on_date).endOf("day").toDate() },
      },
    },
    {
      $unwind: "$transactions",
    },
    {
      $match: {
        "transactions.product_id": { $eq: new mongoose.Types.ObjectId(current_product_id) },
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: "$transactions.qty" },
      },
    },
  ]);

  allIssues.map((item) => {
    qty -= item.total;
  });

  return { qty: parseFloat(qty).toFixed(2), lpp, current_product_id };
}

router.get("/getPendingStock", async (req, res) => {
  product_id = req.query.product_id;
  workshop_id = req.query.workshop_id;
  tran_date = req.query.tran_date;
  const products = await Products.find({ _id: req.params.id });

  //const po = await Purchases_other.find();
  //const po = await Purchases_other.find({ transactions: { $elemMatch: { project_id: req.params.id } } });
  //const os = await OpeningStock.find({ product_id: req.params.id });
  //const mio = await MIO.find();

  obj = await findstock(product_id, workshop_id, tran_date);

  return res.status(SUCCESS).send(addMarkup(1, "Purchases Obtained Successfully", { pending_stock: obj }));
});

router.get("/getCosting", async (req, res) => {
  start_date = req.query.start_date;
  end_date = req.query.end_date;
  const workshops = Loadworkshops();

  const mio = await MIO.find({ transaction_date: { $gte: new Date(start_date), $lte: new Date(end_date) } });

  result = [];
  mio.map((item) => {
    workshop_name = findWorkshopName(workshops, item.to_workshop_id);
    total_issue_value = 0;

    item.transactions.map((i) => {
      total_issue_value += i.value;
    });

    result.push({ to_workshop_id: item.to_workshop_id, workshop_name: workshop_name, total_issue_value: total_issue_value });
  });

  result_final = [];

  result.forEach(function (a) {
    if (!this[a.workshop_name]) {
      this[a.workshop_name] = { workshop_id: a.to_workshop_id, workshop_name: a.workshop_name, total_issue_value: 0 };

      result_final.push(this[a.workshop_name]);
    }
    this[a.workshop_name].total_issue_value += a.total_issue_value;
  }, Object.create(null));

  return res.status(SUCCESS).send(addMarkup(1, "Costing obtained Successfully", { costing: result_final }));
});

router.get("/getPendingStockAll", async (req, res) => {
  workshop_id = req.query.workshop_id;
  tran_date = req.query.tran_date;
  const products = await Products.find({ product_group: "Chemical" });

  //const po = await Purchases_other.find();
  //const os = await OpeningStock.find();
  //const mio = await MIO.find();

  result = [];
  for (counter = 0; counter < products.length; counter++) {
    obj = await findstock(products[counter]._id, workshop_id, tran_date);
    result.push({ _id: obj.current_product_id, qty: obj.qty, lpp: obj.lpp, product_name: products[counter].product_name });
  }
  return res.status(SUCCESS).send(addMarkup(1, "Purchases Obtained Successfully", { pending_stock: result }));
});

router.get("/get-consumption-summary", async (req, res) => {
  startDate = req.query.startDate;
  endDate = req.query.endDate;

  const sd = moment(startDate).startOf("day").toDate();
  const ed = moment(endDate).endOf("day").toDate();

  const result = await MaterialIssueothers.aggregate([
    {
      $match: {
        transaction_date: {
          $gte: sd,
          $lte: ed,
        },
      },
    },
    { $unwind: "$transactions" },
    {
      $group: {
        _id: {
          product_id: "$transactions.product_id",
          transaction_date: "$transaction_date",
        },
        totalQuantity: { $sum: "$transactions.qty" },
        totalValue: { $sum: "$transactions.value" },
      },
    },
    {
      $lookup: {
        from: "products",
        localField: "_id.product_id",
        foreignField: "_id",
        as: "productDetails",
      },
    },
    { $unwind: "$productDetails" },
    {
      $project: {
        _id: 0,
        product_id: "$_id.product_id",
        transaction_date: "$_id.transaction_date",
        totalQuantity: 1,
        totalValue: 1,
        "productDetails.product_name": 1,
      },
    },
    { $sort: { transaction_date: 1, "productDetails.product_name": 1 } },
  ]);

  return res.status(SUCCESS).send(addMarkup(1, "Consumption summary", { consumption_summary: result }));
});

/*
  Stock report created on 05 Oct 2024. 
  Start date and End Date 2 parameter will be processed from query string and report will be generated.
*/
router.get("/get-stock-report", async (req, res) => {
  let startDate = convertDateToISO(req.query.start_date);
  let endDate = convertDateToISO(req.query.end_date);

  const products = await Products.find({ product_group: "Chemical" }).sort({ product_name: 1 });

  let result = [];
  for (let counter = 0; counter < products.length; counter++) {
    product = products[counter];

    let opening = 0;
    let purchases = 0;
    let consumption = 0;
    let lpp = 0;
    const currentProductId = product._id;
    const productName = product.product_name;

    const openingStockPromise = OpeningStock.find({ product_id: currentProductId }).then((items) => {
      items.forEach((item) => {
        opening += item.qty;
        lpp = item.rate;
      });
    });

    let openingPurchasesPromise = Purchases_other.aggregate([
      {
        $match: {
          purchase_date: { $lt: moment(startDate).startOf("day").toDate(), $gte: moment("2024-07-31T18:29:59.000Z").endOf("day").toDate() },
        },
      },
      {
        $unwind: "$transactions",
      },
      {
        $match: {
          "transactions.product_id": { $eq: new mongoose.Types.ObjectId(currentProductId) },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$transactions.qty" },
        },
      },
    ]).then((allPurchases) => {
      allPurchases.forEach((item) => {
        opening += item.total;
      });
    });

    const purchasesPromise = Purchases_other.aggregate([
      {
        $match: {
          purchase_date: { $gte: moment(startDate).startOf("day").toDate(), $lte: moment(endDate).endOf("day").toDate() },
        },
      },
      {
        $unwind: "$transactions",
      },
      {
        $match: {
          "transactions.product_id": { $eq: new mongoose.Types.ObjectId(currentProductId) },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$transactions.qty" },
        },
      },
    ]).then((allPurchases) => {
      allPurchases.forEach((item) => {
        purchases += item.total;
      });
    });

    /* Not applying start date. let it pick last purchasing price */

    const lastPurchasePromise = Purchases_other.find({
      transactions: { $elemMatch: { product_id: currentProductId, purchase_date: { $lte: moment(endDate).endOf("day").toDate() }, purchase_date: { $gte: moment("2024-07-31T18:29:59.000Z").endOf("day").toDate() } } },
    })
      .sort({ purchase_date: -1 })
      .limit(1)
      .then((lastPurchase) => {
        lastPurchase.map((item) => {
          item.transactions.map((tem) => {
            if (tem.product_id.equals(currentProductId)) {
              lpp = parseFloat((tem.value + tem.igst + tem.cgst + tem.sgst) / tem.qty).toFixed(2);
            }
          });
        });
      });

    const allIssuesBeforeStartPromise = MIO.aggregate([
      {
        $match: {
          transaction_date: { $lt: moment(startDate).startOf("day").toDate() },
        },
      },
      {
        $unwind: "$transactions",
      },
      {
        $match: {
          "transactions.product_id": { $eq: new mongoose.Types.ObjectId(currentProductId) },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$transactions.qty" },
        },
      },
    ]).then((allIssues) => {
      allIssues.map((item) => {
        opening -= item.total;
      });
    });

    const allIssuesPromise = MIO.aggregate([
      {
        $match: {
          transaction_date: { $gte: moment(startDate).startOf("day").toDate(), $lte: moment(endDate).endOf("day").toDate() },
        },
      },
      {
        $unwind: "$transactions",
      },
      {
        $match: {
          "transactions.product_id": { $eq: new mongoose.Types.ObjectId(currentProductId) },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$transactions.qty" },
        },
      },
    ]).then((allIssues) => {
      allIssues.map((item) => {
        consumption += item.total;
      });
    });

    await Promise.all([openingStockPromise, openingPurchasesPromise, purchasesPromise, lastPurchasePromise, allIssuesBeforeStartPromise, allIssuesPromise]);

    //console.log("Processing " + counter + " currentProductId = " + productName);

    if (opening != 0 || consumption != 0 || purchases != 0)
      result.push({ _id: currentProductId, productName, opening: parseFloat(opening).toFixed(2), purchase: parseFloat(purchases).toFixed(2), consumption: parseFloat(consumption).toFixed(2), lpp });
  }

  return res.status(SUCCESS).send(addMarkup(1, "", { stock: result }));
});

module.exports = router;
