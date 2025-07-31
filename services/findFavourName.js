function find_favour_name ( favours , id ){
    return_value = "";
    favours.map((item) => item._id == id ? return_value = item.name : "" );
    return return_value;
}
 
module.exports = find_favour_name;