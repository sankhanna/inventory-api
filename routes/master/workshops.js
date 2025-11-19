const express = require("express");
const router = express.Router();
const WorkshopsModel = require("../../models/Workshops");

router.get("/", async (req, res) => {
  const workshops = await WorkshopsModel.find({}).sort({ _id: 1 });
  return res.status(SUCCESS).send(addMarkup(1, "Workshops", { workshops }));
});

module.exports = router;
