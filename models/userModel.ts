import mongoose = require("mongoose");

// For the sub document, we don't use a separate schema.

//export var circleMemberSchema = new mongoose.Schema({
//    circleId: String,
//    startDate: Date,
//    endDate: Date
//});

/**
 * Membership token of the user for a specific circle.
 */
// Circle membership is stored in the user document itself, not in a separate collection. To be able
// to work with this in a productive, typesafe manner we define it as a class. That way a circle
// membership can be created like so:
//  var cm = new CircleMembership();
//  cm.circleId = "12345";
//  myUser.circleMemberships.push(cm);
export class CircleMembership {
    /**
     * The ID of the corresponding Circle.
     */
    circleId: string;
    /**
     * Join date
     */
    startDate: Date;
    
    /**
     * Date the user left the circle.
     */
    endDate: Date;
}

export var userSchema = new mongoose.Schema({
    name: String,
    externalID: String,
    accessToken: String,
    //circleMemberships: [circleMemberSchema]
    circleMemberships: [{
        circleId: String,
        startDate: Date,
        endDate: Date
    }]
});

export interface IUser extends mongoose.Document {
    name: string;
    /**
     * For users primarily defined by an external authenticator, the User ID. E.g. BitReserve user name.
     */
    externalID: string;

    /**
     * Current OAuth access token for the user at the external authenticator.
     * TODO: refactor to a subtype, incorporate expiration date.
     */
    accessToken: string;
    /**
     * Circles this user is a member of.
     */
    circleMemberships: [CircleMembership];
}

export var User = mongoose.model<IUser>("Users", userSchema);

/**
 * Get a user by their access token.
 */
export var getUserByAccessToken = (token: string, cb: any) => {
    User.findOne({ accessToken: token }, function (err, user) {
        // TODO: use promise to wait for creating new user.
        if (!user) {
            // No user with this token.
            cb("Not found", null)
        }

        // TODO: check for validity of the token.

        cb(null, <IUser>user);
    });
}

/**
 * Gets the users who are in a certain circle.
 */
export var getUsersInCircle = (circleId: string, cb: any) => {
    User.find({})
        .where("circleMemberships.circleId").equals(circleId)
        .exec(cb);
}