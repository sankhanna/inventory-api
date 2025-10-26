const express = require("express");
const router = express.Router();
const findProductionWorkShops = require("../../services/productionworkshops");

router.get("/", async (req, res) => {
  workshops = findProductionWorkShops();
  return res.status(SUCCESS).send(addMarkup(1, "Workshops", { workshops: workshops }));
});

module.exports = router;
