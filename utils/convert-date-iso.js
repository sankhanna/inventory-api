const convertDateToISO = (dateString) => {
  let parts = dateString.split("-");
  let formattedDate = `${parts[2]}-${formatMonthToNumber(parts[1])}-${parts[0]}`;
  return formattedDate;
};

function formatMonthToNumber(monthString) {
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

module.exports = convertDateToISO;
