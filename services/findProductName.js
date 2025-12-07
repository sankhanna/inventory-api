function find_product_name(products, id) {
  let return_value = "";
  for (let counterProductName = 0; counterProductName < products.length; counterProductName++) {
    let item = products[counterProductName];
    if (JSON.stringify(item._id) == JSON.stringify(id)) {
      return_value = item.product_name;
      break;
    }
  }
  return return_value;
}

module.exports = find_product_name;