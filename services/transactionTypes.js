function transaction_types (){
	const list = [ { _id: "O" , name: "Opening" } , {  _id: "T" , name: "Transaction"  } , {  _id: "W" , name: "Wastage" }  ];
    return list;
}
module.exports = transaction_types;