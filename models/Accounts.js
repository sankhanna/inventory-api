const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const AccountSchema = mongoose.Schema({
    account_group: { type: String, required: true },
    account_name: { type: String, required: true },
    balance_type: { type: String, require: true },
    balance: { type: Number, required: false, default: 0 },
    agent_id: { type: Schema.Types.ObjectId, required: false, ref: 'Agents' },
    brokerage_rate: { type: Number, required: false },
    gstin: { type: String, require: false },
    address_line1: { type: String, require: false },
    address_line2: { type: String, require: false },
    address_line3: { type: String, require: false },
    city: { type: String, required: false },
    state: { type: String, required: false },
    create_user_id: { type: Number, required: true },
    change_user_id: { type: Number, required: true },
    create_date: { type: Date, required: true },
    change_date: { type: Date, required: true }
});

module.exports = mongoose.model("accounts" , AccountSchema);