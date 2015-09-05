import mongoose = require("mongoose");

export var circleSchema = new mongoose.Schema({
    name: String,
    commonBond:String,
});

export interface ICircle extends mongoose.Document {
    name: string;
    commonBond: string;
}

/**
 * A money circle.
 */
export var Circle = mongoose.model<ICircle>("Circles", circleSchema);