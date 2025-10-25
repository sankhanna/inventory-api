const jsonStringify = (data) => {
  return JSON.stringify(data);
};

const frmString = (data) => {
  if (data == undefined) return "";
  else if (data == null) return "";
  else return data;
};

const getDate = (data) => {
  let created_date = new Date(data);
  let months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  let year = created_date.getFullYear();
  let month = months[created_date.getMonth()];
  let date = created_date.getDate();
  let hour = created_date.getHours();
  let min = created_date.getMinutes();
  let sec = created_date.getSeconds();
  let time = date + "-" + month + "-" + year;
  return time;
};

function dynamicSort(property) {
  var sortOrder = 1;
  if (property[0] === "-") {
    sortOrder = -1;
    property = property.substr(1);
  }
  return function (a, b) {
    /* next line works with strings and numbers,
     * and you may want to customize it to your needs
     */
    var result = a[property] < b[property] ? -1 : a[property] > b[property] ? 1 : 0;
    return result * sortOrder;
  };
}

const addMarkup = (status, message, data) => {
  const result = { status: status, message: message, data: data };
  return result;
};

module.exports.co = jsonStringify;

module.exports.formString = frmString;

module.exports.getDate = getDate;

module.exports.dynamicSort = dynamicSort;

module.exports.addMarkup = addMarkup;
