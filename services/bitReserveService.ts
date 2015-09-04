import request = require('request');
import userModel = require('../models/userModel');

// Enable request debugging
// TODO: make configurable (config debug option)
require('request').debug = true;

export class BitReserveService {
    constructor(
        private authorizationToken: string) {
    }
    /**
     * Gets info about the current user.
     */
    getUser(callback) {
        console.log("Calling API with token: " + this.authorizationToken);
        request.get('https://api.bitreserve.org/v0/me',
            {
                headers: {
                    "Authorization": "Bearer " + this.authorizationToken
                }
            }, function (error, response, body) {
                if (!error && response.statusCode == 200) {
                    var userData = JSON.parse(body);

                    // Create a new user array.
                    // TODO: create an interface for this (can't be IUser because that extends Mongoose.Document).
                    var user = {
                        name: userData.name,
                        externalID: userData.email,
                    };

                    callback(null, user);
                } else {
                    console.log("Error getting user data: " + error);
                    callback(error, null);
                }
            });

    }

    getCards(callback) {

        console.log("Calling API with token: " + this.authorizationToken);
        request.get('https://api.bitreserve.org/v0/me/cards',
            {
                headers: {
                    "Authorization": "Bearer " + this.authorizationToken
                }
            }, function (error, response, body) {
                if (!error && response.statusCode == 200) {
                    var cards = JSON.parse(body);

                    callback(null, cards);
                } else {
                    console.log("Error getting cards data: " + error);
                    callback(error, null);
                }
            });

    }
}