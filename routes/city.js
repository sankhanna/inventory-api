const fs = require("fs");
const Joi = require("joi-oid");
const express = require("express");
const router = express.Router();
const City = require("../models/City");
const verifyID = require("../utils/verify");
const filecontent = require("../utils/readFile");

function validation_schema() {
  const schema = Joi.object({ city_id: Joi.objectId().optional(), city_name: Joi.string().min(2).max(100).required() });
  return schema;
}

router.get("/", async (req, res) => {
  //const city = await City.find().sort({ city_name: 1 });
  const city = JSON.parse(filecontent("city.json"));

  if (city.length == 0) return res.status(SUCCESS).send(addMarkup(1, "No City Found", { city: [] }));
  else return res.status(SUCCESS).send(addMarkup(1, "City Obtained Successfully", { city: city }));
});

router.get("/cityDetail/:id", async (req, res) => {
  const city = await City.findById({ _id: req.params.id });
  return res.status(SUCCESS).send(addMarkup(1, "City Obtained Successfully", { city: city }));
});

router.post("/", async (req, res) => {
  const schema = validation_schema();

  const result = schema.validate(req.body);
  if (result.error != null) {
    return res.status(BADREQUEST).send(addMarkup(0, result.error.message, {}));
  }

  let city = null;
  if (result.value.city_id == null) {
    city = new City({ city_name: result.value.city_name, create_date: new Date(), change_date: new Date(), create_user_id: req.headers.user_id, change_user_id: req.headers.user_id });
  } else {
    city = await City.findById({ _id: result.value.city_id });
    city.city_name = result.value.city_name;

    city.create_date = new Date();
    city.create_user_id = req.headers.user_id;

    city.change_date = new Date();
    city.change_user_id = req.headers.user_id;
  }
  const saveResult = await city.save();

  const tmpData = await City.find().sort({ city_name: 1 });
  fs.writeFile("./presets/city.json", JSON.stringify(tmpData), (err) => {
    if (err) throw err;
  });

  if (saveResult) {
    return res.status(SUCCESS).send(addMarkup(1, "City successfully", { city: saveResult }));
  } else {
    return res.status(BADREQUEST).send(addMarkup(0, "Could not save city", { city: {} }));
  }
});

module.exports = router;
