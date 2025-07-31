const addMarkup = (status , message , data) => { 
    const result = { "status": status , "message": message, "data": data };
    return result;
};

module.exports.addMarkup = addMarkup;