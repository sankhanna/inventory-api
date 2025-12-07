const Devices = require("../models/Devices.js");

async function registerDevice(dev_id) {
  let device = await Devices.findOne({ device_id: dev_id });

  if (device == null) {
    let new_device_code = "";
    while (true) {
      new_device_code = generate_device_code(8);
      const devices = await Devices.find({ device_code: { $regex: new_device_code, $options: "i" } });
      if (devices.length == 0) {
        console.log("No Duplicate found so breaking up");
        break;
      }
    }
    device = new Devices({
      device_id: dev_id,
      device_code: new_device_code,
    });

    device = await device.save();
  }
  return device;
}

function generate_device_code(len) {
  let charSet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  var randomString = "";
  for (var i = 0; i < len; i++) {
    var randomPoz = Math.floor(Math.random() * charSet.length);
    randomString += charSet.substring(randomPoz, randomPoz + 1);
  }
  return randomString;
}

module.exports = registerDevice;
