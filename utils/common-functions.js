function _formatMonthToNumber(monthString) {
  monthString = monthString.toUpperCase();
  if (monthString === "JAN") return "01";
  if (monthString === "FEB") return "02";
  if (monthString === "MAR") return "03";
  if (monthString === "APR") return "04";
  if (monthString === "MAY") return "05";
  if (monthString === "JUN") return "06";
  if (monthString === "JUL") return "07";
  if (monthString === "AUG") return "08";
  if (monthString === "SEP") return "09";
  if (monthString === "OCT") return "10";
  if (monthString === "NOV") return "11";
  if (monthString === "DEC") return "12";
}

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

function randomNumber(length) {
  var result = "";
  var characters = "0123456789";
  var charactersLength = characters.length;
  for (var i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

function randomString(length) {
  var result = "";
  var characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  var charactersLength = characters.length;
  for (var i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

const convertDateToISO = (dateString) => {
  let parts = dateString.split("-");
  let formattedDate = `${parts[2]}-${_formatMonthToNumber(parts[1])}-${parts[0]}`;
  return formattedDate;
};

module.exports.co = jsonStringify;

module.exports.formString = frmString;

module.exports.getDate = getDate;

module.exports.dynamicSort = dynamicSort;

module.exports.addMarkup = addMarkup;

module.exports.randomNumber = randomNumber;

module.exports.randomString = randomString;

module.exports.convertDateToISO = convertDateToISO;
