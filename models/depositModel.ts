import mongoose = require("mongoose");

export var depositSchema = new mongoose.Schema({
    fromCard: String,
    amount: String,
    circleId: mongoose.Schema.Types.ObjectId,
    userId: mongoose.Schema.Types.ObjectId,
    transactionId: String,
    depositIndex: Number,
    currency: String,
    dateTime: Date
});

export interface IDeposit extends mongoose.Document {
    fromCard: string;
    amount: number;
    circleId: string;
    userId: string;
    transactionId: string;
    depositIndex: number;
    currency: string;
    dateTime: Date;
}


/**
 * A deposit to a circle.
 */
export var Deposit = mongoose.model<IDeposit>("Deposits", depositSchema);