function find_user_name ( users , id ){
    return_value = "";
    users.map((item) => JSON.stringify(item.id) == JSON.stringify(id) ? return_value = item.abbr : "" );
    return return_value;
}
 
module.exports = find_user_name;