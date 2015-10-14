import mongoose = require("mongoose");

export var circleSchema = new mongoose.Schema({
    contractAddress: String,
    name: String,
    commonBond: String,
    interestPercentage: Number,
    administrators: [mongoose.Schema.Types.ObjectId]
});

export interface ICircle extends mongoose.Document {
    contractAddress: string;
    name: string;
    commonBond: string;
    interestPercentage: number;
    /**
     * Circle administrators, by user ID
     */
    administrators: string[];
}

/**
 * A money circle.
 */
export var Circle = mongoose.model<ICircle>("Circles", circleSchema);
