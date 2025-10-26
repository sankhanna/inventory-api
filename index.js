const express = require("express");
const app = express();
const mongoose = require("mongoose");
const compression = require("compression");
// const logger = require("./middleware/logger");
var cors = require("cors");
const { co, formString, addMarkup } = require("./utils/common-functions");

// app.use(function (req, res, next) {
//   res.header("Access-Control-Allow-Origin", "http://localhost:3000");
//   res.header(
//     "Access-Control-Allow-Headers",
//     "Origin, X-Requested-With, Content-Type, Accept"
//   );
//   next();
// });

app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

app.use(cors());

const header = require("./middleware/readHeader");
require("dotenv").config();

global.BADREQUEST = 404;
global.SUCCESS = 200;
global.PAGESIZE = 20;
global.addMarkup = addMarkup;
global.CO = co;
global.formString = formString;

mongoose.connect(process.env.DB_URL, { useNewUrlParser: true, useUnifiedTopology: true });

const account = require("./routes/master/account");
const agent = require("./routes/master/agent");
const balancetype = require("./routes/master/balancetype");
const city = require("./routes/master/city");
const favour = require("./routes/master/favour");
const group_product = require("./routes/master/group_product");
const transport = require("./routes/master/transport");
const transactionTypes = require("./routes/master/transaction_types");
const product = require("./routes/master/product");
const group = require("./routes/master/group");
const state = require("./routes/master/state");
const workshops = require("./routes/master/workshops");
const productionworkshops = require("./routes/master/productionworkshops");
const user = require("./routes/master/user");
const purchase = require("./routes/purchase");
const purchase_other = require("./routes/purchase_other");
const materialreceipt = require("./routes/materialreceipt");
const finishedreceipt = require("./routes/finishedreceipt");
const finishedissue = require("./routes/finishedissue");
const materialissue = require("./routes/materialissue");
const materialissueother = require("./routes/materialissueother");
const stock = require("./routes/stock");
const stockother = require("./routes/stock_other");
const batchsearch = require("./routes/batchsearch");
const opening_stock = require("./routes/opening_stock");

app
  .use(compression())
  .use(express.json())
  //.use(logger)
  .use(header)
  .use("/api/account", account)
  .use("/api/agent", agent)
  .use("/api/city", city)
  .use("/api/transport", transport)
  .use("/api/product", product)
  .use("/api/state", state)
  .use("/api/group", group)
  .use("/api/group_product", group_product)
  .use("/api/balancetype", balancetype)
  .use("/api/purchase", purchase)
  .use("/api/purchaseOther", purchase_other)
  .use("/api/openingStock", opening_stock)
  .use("/api/workshops", workshops)
  .use("/api/productionworkshops", productionworkshops)
  .use("/api/materialreceipt", materialreceipt)
  .use("/api/materialissue", materialissue)
  .use("/api/materialissueother", materialissueother)
  .use("/api/favour", favour)
  .use("/api/transactiontypes", transactionTypes)
  .use("/api/stock", stock)
  .use("/api/stockother", stockother)
  .use("/api/batchsearch", batchsearch)
  .use("/api/finishedreceipt", finishedreceipt)
  .use("/api/finishedissue", finishedissue)
  .use("/api/user", user);

const port = process.env.PORT || 5002;
var server = app.listen(port, () => {
  console.log(server.address().address);
  console.log(`Listening on port ${port}.`);
});
