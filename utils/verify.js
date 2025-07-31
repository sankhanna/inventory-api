function verifyID(inval){
    if (!(inval.match(/^[0-9a-fA-F]{24}$/)))
        return false;
    else
        return true;
}

module.exports = verifyID;