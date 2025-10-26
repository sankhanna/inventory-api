const express = require("express");
const router = express.Router();

router.get("/", async (req, res) => {
  const balance_types = [
    { _id: "D", type_name: "Debit" },
    { _id: "C", type_name: "Credit" },
  ];
  return res.status(SUCCESS).send(addMarkup(1, "Balance types found", { balance_types: balance_types }));
});

module.exports = router;
