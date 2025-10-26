const Joi = require("joi-oid");
const express = require("express");
const router = express.Router();
const State = require("../../models/States");

router.get("/", async (req, res) => {
  const state = await State.find().sort({ state_name: 1 });

  if (state.length == 0) return res.status(SUCCESS).send(addMarkup(1, "No state Found", { states: [] }));
  else return res.status(SUCCESS).send(addMarkup(1, "state Obtained Successfully", { states: state }));
});

router.post("/", async (req, res) => {
  const schema = Joi.object({ state_name: Joi.string().min(2).max(100).required(), state_code: Joi.string().min(2).max(2).required() });

  const result = schema.validate(req.body);
  if (result.error != null) {
    return res.status(BADREQUEST).send(addMarkup(0, result.error.message, {}));
  }

  const newstate = new State({ state_name: result.value.state_name, state_code: result.value.state_code });
  const saveResult = await newstate.save();

  if (saveResult) {
    return res.status(SUCCESS).send(addMarkup(1, "state successfully", { state: saveResult }));
  } else {
    return res.status(BADREQUEST).send(addMarkup(0, "Could not save state", { state: {} }));
  }
});

module.exports = router;
