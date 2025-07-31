const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const MaterialIssueSchema = mongoose.Schema({
    transaction_type: { type: String, required: true },
    transaction_date: { type: Date, required: true },
    workshop_id: { type: Number, required: true },
    to_workshop_id: { type: Number, required: true },
    account_id: { type: Schema.Types.ObjectId, required: false, ref: 'Accounts' },

    transactions: [{
        product_id: { type: Schema.Types.ObjectId, required: true, ref: 'Product' },
        material_issue_ref_id: { type: Schema.Types.ObjectId, required: false, ref: 'MaterialIssue' },
        material_receipt_ref_id: { type: Schema.Types.ObjectId, required: false, ref: 'MaterialReceipt' },
        material_receipt_ref_str: { type: String, required: false },
        pcs: { type: Number, required: true },
        qty: { type: Number, required: true },
        short: { type: Number, required: true },
        nett_qty: { type: Number, required: true },
        rate: { type: Number, required: true },
        value: { type: Number, required: true },
        batch_no: { type: String, required: true },
    }],

    create_user_id: { type: Number, required: true },
    change_user_id: { type: Number, required: true },
    create_date: { type: Date, required: true },
    change_date: { type: Date, required: true }
});

module.exports = mongoose.model("materialissue" , MaterialIssueSchema);