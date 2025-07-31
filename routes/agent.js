const fs = require("fs");
const Joi = require("joi-oid");
const express = require("express");
const router = express.Router();
const Agents = require("../models/Agents");
const filecontent = require("../utils/readFile");

function validation_schema() {
  const schema = Joi.object({ agent_id: Joi.objectId().optional(), agent_name: Joi.string().min(2).max(100).required() });
  return schema;
}

router.get("/", async (req, res) => {
  //const agents = await Agents.find().sort({ agent_name: 1 });
  const agents = JSON.parse(filecontent("agents.json"));

  if (agents.length == 0) return res.status(SUCCESS).send(addMarkup(1, "No agent Found", { agents: [] }));
  else return res.status(SUCCESS).send(addMarkup(1, "agent Obtained Successfully", { agents: agents }));
});

router.get("/agentDetail/:id", async (req, res) => {
  const agent = await Agents.findById({ _id: req.params.id });
  return res.status(SUCCESS).send(addMarkup(1, "agent Obtained Successfully", { agent: agent }));
});

router.post("/", async (req, res) => {
  const schema = validation_schema();

  const result = schema.validate(req.body);
  if (result.error != null) {
    return res.status(BADREQUEST).send(addMarkup(0, result.error.message, {}));
  }

  let agent = null;
  if (result.value.agent_id == null) {
    agent = new Agents({ agent_name: result.value.agent_name, create_date: new Date(), change_date: new Date(), create_user_id: req.headers.user_id, change_user_id: req.headers.user_id });
  } else {
    agent = await Agents.findById({ _id: result.value.agent_id });
    agent.change_date = new Date();
    agent.change_user_id = req.headers.user_id;
    agent.create_date = new Date();
    agent.create_user_id = req.headers.user_id;
    agent.agent_name = result.value.agent_name;
  }
  const saveResult = await agent.save();

  const tmpData = await Agents.find().sort({ agent_name: 1 });

  fs.writeFile("./presets/agents.json", JSON.stringify(tmpData), (err) => {
    if (err) throw err;
  });

  if (saveResult) {
    return res.status(SUCCESS).send(addMarkup(1, "Agent saved successfully", { agent: saveResult }));
  } else {
    return res.status(BADREQUEST).send(addMarkup(0, "Could not save agent", { agent: {} }));
  }
});

module.exports = router;
