const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const FinishedReceiptSchema = mongoose.Schema({
    transaction_type: { type: String, required: true },
    transaction_date: { type: Date, required: true },
    account_id: { type: Schema.Types.ObjectId, required: false, ref: 'Accounts' },

    transactions: [{
        product_id: { type: Schema.Types.ObjectId, required: true, ref: 'Product' },
        qty: { type: Number, required: true },
        pcs: { type: Number, required: true },
        rate: { type: Number, required: true },
        value: { type: Number, required: true }
    }],

    create_user_id: { type: Number, required: true },
    change_user_id: { type: Number, required: true },
    create_date: { type: Date, required: true },
    change_date: { type: Date, required: true }
});

module.exports = mongoose.model("finishedreceipt" , FinishedReceiptSchema);