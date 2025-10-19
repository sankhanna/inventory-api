const NodeCache = require("node-cache");
const fs = require("fs");
const Joi = require("joi-oid");
const express = require("express");
const router = express.Router();
const Transports = require("../models/Transport");
const myCache = new NodeCache({ stdTTL: 3600 });

function validation_schema() {
  const schema = Joi.object({ transport_id: Joi.objectId().optional(), transport_name: Joi.string().min(2).max(100).required() });
  return schema;
}

router.get("/", async (req, res) => {
  let transports;

  const cacheKey = `data-transport`;
  const cachedData = myCache.get(cacheKey);
  if (cachedData) {
    console.log("Serving transport from cache:", cacheKey);
    transports = cachedData;
  } else {
    console.log("Refershing cache:", cacheKey);
    transports = await Transports.find().sort({ transport_name: 1 });
    myCache.set(cacheKey, transports);
  }

  if (transports.length == 0) return res.status(SUCCESS).send(addMarkup(1, "No transport Found", { transports: [] }));
  else return res.status(SUCCESS).send(addMarkup(1, "transport Obtained Successfully", { transports: transports }));
});

router.get("/transportDetail/:id", async (req, res) => {
  const transport = await Transports.findById({ _id: req.params.id });
  return res.status(SUCCESS).send(addMarkup(1, "transport Obtained Successfully", { transport: transport }));
});

router.post("/", async (req, res) => {
  const schema = validation_schema();

  const result = schema.validate(req.body);
  if (result.error != null) {
    return res.status(BADREQUEST).send(addMarkup(0, result.error.message, {}));
  }

  let transport = null;
  if (result.value.transport_id == null) {
    transport = new Transports({ transport_name: result.value.transport_name, create_date: new Date(), change_date: new Date(), create_user_id: req.headers.user_id, change_user_id: req.headers.user_id });
  } else {
    transport = await Transports.findById({ _id: result.value.transport_id });
    transport.transport_name = result.value.transport_name;
    transport.change_date = new Date();
    transport.change_user_id = req.headers.user_id;
    transport.create_date = new Date();
    transport.create_user_id = req.headers.user_id;
  }
  const saveResult = await transport.save();
  myCache.flushAll();
  console.log("Entire cache flushed.");
  if (saveResult) {
    return res.status(SUCCESS).send(addMarkup(1, "Transport saved successfully", { transport: saveResult }));
  } else {
    return res.status(BADREQUEST).send(addMarkup(0, "Could not save transport", { transport: {} }));
  }
});

module.exports = router;
