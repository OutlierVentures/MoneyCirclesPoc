import mongoose = require("mongoose");

export var userSchema = new mongoose.Schema({
    name: String,
    externalID: String,
    accessToken: String
});

export interface IUser extends mongoose.Document {
    name: string;
    externalID: string;
    accessToken: string;
}

export var repository = mongoose.model<IUser>("Users", userSchema);