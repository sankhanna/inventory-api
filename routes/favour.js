const Joi = require("joi-oid");
const express = require("express");
const router = express.Router();

router.get("/", async (req, res) => {
  let favours = [
    { _id: "SPM", name: "SPM" },
    { _id: "SEPL", name: "SEPL" },
    { _id: "SPMPL", name: "SPMPL" },
  ];
  return res.status(SUCCESS).send(addMarkup(1, "favours", { favours: favours }));
});

module.exports = router;
