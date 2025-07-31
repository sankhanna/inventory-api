function find_transport_name(transports, id) {
  let return_value = "";
  for (let counterTransportName = 0; counterTransportName < transports.length; counterTransportName++) {
    let item = transports[counterTransportName];
    if (JSON.stringify(item._id) == JSON.stringify(id)) {
      return_value = item.transport_name;
      break;
    }
  }
  return return_value;
}

// function find_transport_name(transports, id) {
//   return_value = "";
//   transports.map((item) => (JSON.stringify(item._id) == JSON.stringify(id) ? (return_value = item.transport_name) : ""));
//   return return_value;
// }

module.exports = find_transport_name;
