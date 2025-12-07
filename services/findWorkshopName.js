function find_workshop_name ( workshops , id ){
    let return_value = "";
    workshops.map((item) => item._id == id ? return_value = item.name : "" );
    return return_value;
}
 
module.exports = find_workshop_name;