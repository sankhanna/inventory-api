async function send_message_using_twilio(to_phone_number , message )
{
    try
    {
        var client = require('twilio')(
            process.env.TWILIO_ACCOUNT_SID,
            process.env.TWILIO_AUTH_TOKEN
        );

        client.messages.create({
            from: process.env.TWILIO_PHONE_NUMBER,
            to: to_phone_number,
            body: message
        }).then((message) => {
            console.log(message.sid);
            console.log(message);
        });
        
    }
    catch(e)
    {
        console.log("Error sending message");
        console.log(e);
    }
}

async function send_message_using_fast2sms(to_phone_number , otp )
{
    const axios = require("axios");

    const headers = {
        "authorization": "JAg7k2H8OS9oLXQIcxnYuzsiKVF6mfDtMTWE4pBlqhP1Cvyaw046CYOcVowhUIgr5Tz8Bp0xetF93yEi"
    };

    try
    {
        await axios.post('https://www.fast2sms.com/dev/bulkV2', {
            "variables_values": otp,
            "route": "otp",
            "numbers": to_phone_number
          }, {
            headers: headers
          })
          .then(function (response) {
            console.log(response);
          })
          .catch(function (error) {
            console.log(error);
          });
    }
    catch(e)
    {
        console.log("Error sending message");
        console.log(e);
    }
}

module.exports.send_message_using_twilio = send_message_using_twilio;

module.exports.send_message_using_fast2sms = send_message_using_fast2sms;