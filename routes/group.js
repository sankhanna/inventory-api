const Joi = require("joi-oid");
const express = require("express");
const router = express.Router();
const Group = require("../models/Groups");
const verifyID = require("../utils/verify");

router.get("/", async (req, res) => {
  const group = await Group.find().sort({ group_name: 1 });

  if (group.length == 0) return res.status(SUCCESS).send(addMarkup(1, "No group Found", { groups: [] }));
  else return res.status(SUCCESS).send(addMarkup(1, "group Obtained Successfully", { groups: group }));
});

router.post("/", async (req, res) => {
  const schema = Joi.object({ group_name: Joi.string().min(2).max(100).required() });

  const result = schema.validate(req.body);
  if (result.error != null) {
    return res.status(BADREQUEST).send(addMarkup(0, result.error.message, {}));
  }

  const newGroup = new Group({ group_name: result.value.group_name });
  const saveResult = await newGroup.save();

  if (saveResult) {
    return res.status(SUCCESS).send(addMarkup(1, "group successfully", { group: saveResult }));
  } else {
    return res.status(BADREQUEST).send(addMarkup(0, "Could not save group", { group: {} }));
  }
});

router.put("/:id", async (req, res) => {
  if (verifyID(req.params.id) == false) return res.status(BADREQUEST).json(addMarkup(0, "Invalid group id provided", { group: {} }));
  const schema = Joi.object({ group_name: Joi.string().min(2).max(100).required() });

  const result = schema.validate(req.body);
  if (result.error != null) {
    return res.status(BADREQUEST).send(addMarkup(0, result.error.message, {}));
  }

  const group = await Group.findById(req.params.id);
  if (group == null) return res.status(BADREQUEST).send(addMarkup(0, "group not found", {}));

  group.group_name = result.value.group_name;

  const saveResult = await group.save();
  return res.status(SUCCESS).json(addMarkup(1, "group name updated", { group: saveResult }));
});

module.exports = router;
