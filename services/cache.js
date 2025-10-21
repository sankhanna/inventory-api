const NodeCache = require("node-cache");
const Transports = require("../models/Transport");

const myCache = new NodeCache({ stdTTL: 3600 });
const transportCacheKey = `data-transport`;

async function transportCache() {
  let transports;

  const cachedData = myCache.get(transportCacheKey);
  if (cachedData) {
    console.log("Serving transport from cache:", transportCacheKey);
    transports = cachedData;
  } else {
    console.log("Refershing cache:", transportCacheKey);
    transports = await Transports.find().sort({ transport_name: 1 });
    myCache.set(transportCacheKey, transports);
  }
  return transports;
}

async function clearTransportCache() {
  myCache.flushAll();
}

module.exports.transportCache = transportCache;
module.exports.clearTransportCache = clearTransportCache;
