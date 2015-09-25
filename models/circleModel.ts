import mongoose = require("mongoose");

export var circleSchema = new mongoose.Schema({
    contractAddress: String,
    name: String,
    commonBond: String,
    administrators: [mongoose.Schema.Types.ObjectId]
});

export interface ICircle extends mongoose.Document {
    contractAddress: string;
    name: string;
    commonBond: string;
    /**
     * Circle administrators, by user ID
     */
    administrators: string[];
}

/**
 * A money circle.
 */
export var Circle = mongoose.model<ICircle>("Circles", circleSchema);
