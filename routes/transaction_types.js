const express = require("express");
const router = express.Router();
const findTransactionTypes = require("../services/transactionTypes");

router.get("/", async (req, res) => {
  list = findTransactionTypes();
  return res.status(SUCCESS).send(addMarkup(1, "transactiontypes", { transactiontypes: list }));
});

module.exports = router;
