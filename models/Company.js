const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CompanySchema = mongoose.Schema({
    company_name: { type: String, required: true },
    start_date: { type: String, require: true },
    end_date: { type: Number, required: true }
});

module.exports = mongoose.model("company" , CompanySchema);