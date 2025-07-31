const express = require("express");
const router = express.Router();
const findWorkShops = require("../services/workshops");

router.get("/", async (req, res) => {
  workshops = findWorkShops();
  return res.status(SUCCESS).send(addMarkup(1, "Workshops", { workshops: workshops }));
});

module.exports = router;
