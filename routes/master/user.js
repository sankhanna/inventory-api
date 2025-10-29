const Joi = require("joi-oid");
const express = require("express");
const router = express.Router();
const filecontent = require("../../utils/readFile");
const Token = require("../../models/Tokens");
const sha256 = require("sha256");
const { randomNumber, randomString } = require("../../utils/common-functions");
const { send_message_using_fast2sms } = require("../../utils/send-sms");

router.post("/validateUser", async (req, res) => {
  const schema = Joi.object({
    user_name: Joi.string().min(1).max(256).required(),
    password: Joi.string().min(1).max(256).required(),
  });

  const result = schema.validate(req.body);
  if (result.error != null) {
    return res.status(BADREQUEST).send(addMarkup(0, result.error.message, {}));
  }
  const users_json = JSON.parse(filecontent("users.json"));

  const device_id = randomString(255);
  const generated_otp = randomNumber(6);

  let validated_user = { valid_user: false };
  await Promise.all(
    users_json.map(async (item) => {
      if (item.username == sha256(result.value.user_name) && item.password == sha256(result.value.password)) {
        const token = new Token({ device_id, user_id: item.id, user_name: item.username, create_date: Math.floor(Date.now()), otp: generated_otp });
        const saveResult = await token.save();
        validated_user = { ...item, valid_user: true, token: device_id, otp: generated_otp };

        if (item.mobile != "") {
          await send_message_using_fast2sms(item.mobile, generated_otp);
        }
      }
    })
  );
  return res.status(SUCCESS).send(addMarkup(1, "user obtained successfully", { user: validated_user }));
});

module.exports = router;
