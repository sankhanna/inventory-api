const express = require("express");
const router = express.Router();

router.get("/", async (req, res) => {
  const transactiontypes = [
    { _id: "O", name: "Opening" },
    { _id: "T", name: "Transaction" },
    { _id: "W", name: "Wastage" },
  ];
  return res.status(SUCCESS).send(addMarkup(1, "transactiontypes", { transactiontypes }));
});

module.exports = router;
