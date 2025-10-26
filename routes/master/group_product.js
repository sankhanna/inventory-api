const express = require("express");
const router = express.Router();
const Group = require("../../models/Group_product");

router.get("/", async (req, res) => {
  const group = await Group.find();

  if (group.length == 0) return res.status(SUCCESS).send(addMarkup(1, "No group Found", { groups: [] }));
  else return res.status(SUCCESS).send(addMarkup(1, "group Obtained Successfully", { groups: group }));
});

module.exports = router;
