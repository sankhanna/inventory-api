const Joi = require("joi-oid");
const express = require("express");
const router = express.Router();
const Accounts = require("../../models/Accounts");
const verifyID = require("../../utils/verify");

function validation_schema() {
  const schema = Joi.object({
    account_id: Joi.objectId().optional(),
    account_group: Joi.string().min(2).max(100).required(),
    account_name: Joi.string().min(2).max(100).required(),
    balance_type: Joi.string().min(1).max(1).required(),
    balance: Joi.number().optional(),
    agent_id: Joi.objectId().optional(),
    brokerage_rate: Joi.number().optional(),
    gstin: Joi.string().allow(""),
    address_line1: Joi.string().allow(""),
    address_line2: Joi.string().allow(""),
    address_line3: Joi.string().allow(""),
    city: Joi.string().allow(""),
    state: Joi.string().allow(""),
  });

  return schema;
}

async function loadAccountsData() {
  let accounts = await Accounts.find({}).sort({ account_name: 1 });
  return accounts;
}
router.get("/:count", async (req, res) => {
  const accounts = await loadAccountsData();

  if (accounts.length == 0) return res.status(SUCCESS).send(addMarkup(1, "No accounts Found", { accounts: [] }));
  else return res.status(SUCCESS).send(addMarkup(1, "accounts Obtained Successfully", { accounts }));
});

router.get("/", async (req, res) => {
  const accounts = await loadAccountsData();

  if (accounts.length == 0) return res.status(SUCCESS).send(addMarkup(1, "No accounts Found", { accounts: [] }));
  else return res.status(SUCCESS).send(addMarkup(1, "accounts Obtained Successfully", { accounts }));
});

router.get("/accountDetail/:id", async (req, res) => {
  if (verifyID(req.params.id) == false) return res.status(BADREQUEST).json(addMarkup(0, "invalid account id provided", { account: {} }));

  const account = await Accounts.findOne({ _id: req.params.id });
  if (account == null) return res.status(BADREQUEST).send(addMarkup(0, "account not found", { account: {} }));

  return res.status(SUCCESS).send(addMarkup(1, "Accounts Obtained Successfully", { account: account }));
});

router.post("/", async (req, res) => {
  //let device = await verifyDevice(req.headers.device_id);

  const schema = validation_schema();

  const result = schema.validate(req.body);
  if (result.error != null) {
    return res.status(BADREQUEST).send(addMarkup(0, result.error.message, {}));
  }

  let account = null;
  if (result.value.account_id == null) {
    account = new Accounts({
      account_group: result.value.account_group,
      account_name: result.value.account_name,
      balance_type: result.value.balance_type,
      balance: result.value.balance,
      agent_id: result.value.agent_id,
      brokerage_rate: result.value.brokerage_rate,
      gstin: result.value.gstin,
      address_line1: result.value.address_line1,
      address_line2: result.value.address_line2,
      address_line3: result.value.address_line3,
      city: result.value.city,
      state: result.value.state,
      create_date: new Date(),
      change_date: new Date(),
      create_user_id: req.headers.user_id,
      change_user_id: req.headers.user_id,
    });
  } else {
    account = await Accounts.findById({ _id: result.value.account_id });

    account.create_date = new Date();
    account.create_user_id = req.headers.user_id;
    account.change_date = new Date();
    account.change_user_id = req.headers.user_id;
    (account.account_group = result.value.account_group),
      (account.account_name = result.value.account_name),
      (account.balance_type = result.value.balance_type),
      (account.balance = result.value.balance),
      (account.agent_id = result.value.agent_id),
      (account.brokerage_rate = result.value.brokerage_rate),
      (account.gstin = result.value.gstin),
      (account.address_line1 = result.value.address_line1),
      (account.address_line2 = result.value.address_line2),
      (account.address_line3 = result.value.address_line3),
      (account.city = result.value.city),
      (account.state = result.value.state);
  }
  const saveResult = await account.save();

  if (saveResult) {
    return res.status(SUCCESS).send(addMarkup(1, "Account saved successfully", { account: saveResult }));
  } else {
    return res.status(BADREQUEST).send(addMarkup(0, "Could not save account", { account: {} }));
  }
});

module.exports = router;
