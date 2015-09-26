import mongoose = require("mongoose");

export var loanSchema = new mongoose.Schema({
    contractAddress: String,
    amount: String,
    circleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Circles' },
    userId: mongoose.Schema.Types.ObjectId,
    transactionId: String,
    repaymentTransactionId: String,
    currency: String,
    dateTime: Date,
    purpose: String
});

export interface ILoan extends mongoose.Document {
    contractAddress: string;
    amount: number;
    circleId: string;
    userId: string;
    transactionId: string;
    repaymentTransactionId: string;
    currency: string;
    dateTime: Date;
    purpose: string;
}


/**
 * A loan to a circle.
 */
export var Loan = mongoose.model<ILoan>("Loans", loanSchema);
