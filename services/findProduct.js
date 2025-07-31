function find_product(products, id) {
  let return_value = null;
  products.map((item) => (JSON.stringify(item._id) == JSON.stringify(id) ? (return_value = item) : ""));
  return return_value;
}

module.exports = find_product;
