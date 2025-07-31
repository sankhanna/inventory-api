// function find_account_name(accounts, id) {
//   return_value = "";
//   accounts.map((item) => (JSON.stringify(item._id) == JSON.stringify(id) ? (return_value = item.account_name) : ""));
//   return return_value;
// }

function find_account_name(accounts, id) {
  let return_value = "";
  for (let counterAccountName = 0; counterAccountName < accounts.length; counterAccountName++) {
    let item = accounts[counterAccountName];
    if (JSON.stringify(item._id) == JSON.stringify(id)) {
      return_value = item.account_name;
      break;
    }
  }
  return return_value;
}

module.exports = find_account_name;
