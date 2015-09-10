import mongoose = require("mongoose");

export var loanSchema = new mongoose.Schema({
    amount: String,
    circleId: mongoose.Schema.Types.ObjectId,
    userId: mongoose.Schema.Types.ObjectId,
    transactionId: String,
    currency: String,
    dateTime: Date,
    purpose: String
});

export interface ILoan extends mongoose.Document {
    amount: number;
    circleId: string;
    userId: string;
    transactionId: string
    currency: string;
    dateTime: Date;
    purpose: string;
}


/**
 * A loan to a circle.
 */
export var Loan = mongoose.model<ILoan>("Loans", loanSchema);