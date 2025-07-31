const Joi = require("joi-oid");
const express = require("express");
const router = express.Router();
const findFavour = require("../services/favours");

router.get("/", async (req, res) => {
  favours = findFavour();
  return res.status(SUCCESS).send(addMarkup(1, "favours", { favours: favours }));
});

module.exports = router;
