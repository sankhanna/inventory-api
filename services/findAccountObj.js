function find_account_name ( accounts , id ){
    const return_value = accounts.filter((item) => JSON.stringify(item._id) == JSON.stringify(id));
    if ( return_value.length > 0 )
        return return_value[0];
    else
        return null;
}
 
module.exports = find_account_name;