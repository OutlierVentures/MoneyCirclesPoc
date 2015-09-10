import request = require('request');
import userModel = require('../models/userModel');

// Enable request debugging
// TODO: make configurable (config debug option)
require('request').debug = true;

interface IBitReserveTransaction {
    "id": string,
    "type": string,
    "message": string,
    "status": string,
    "RefundedById": string,
    "createdAt": Date,
    "denomination": {
        "amount": number,
        "currency": string,
        "pair": string,
        "rate": number
    },
    "origin": {
        "CardId": string,
        "amount": number,
        "base": number,
        "commission": number,
        "currency": string,
        "description": string,
        "fee": number,
        "rate": number,
        "type": string,
        "username": string
    },
    "destination": {
        "amount": number,
        "base": number,
        "commission": number,
        "currency": string,
        "description": string,
        "fee": number,
        "rate": number,
        "type": string
    },
    "params": {
        "currency": string,
        "margin": number,
        "pair": string,
        "rate": number,
        "ttl": number,
        "type": string
    }
}

export interface IBitReserveCard {
    "address": {
        "bitcoin": string
    },
    "available": number,
    "balance": number,
    "currency": string,
    "id": string,
    "label": string,
    "lastTransactionAt": Date,
    "settings": {
        "position": number,
        "starred": boolean
    },
    "addresses": [
        {
            "id": string,
            "network": string
        }
    ],
    "normalized": [
        {
            "available": number,
            "balance": number,
            "currency": string
        }
    ]

}

interface IBitReserveTransactionCallback {
    (error: any, transaction: IBitReserveTransaction);
}

interface IBitReserveCardsCallback {
    (error: any, cards: Array<IBitReserveCard>);
}

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
                        externalId: userData.username,
                        email: userData.email
                    };

                    callback(null, user);
                } else {
                    console.log("Error getting user data: " + error);
                    callback(error, null);
                }
            });

    }

    getCards(callback : IBitReserveCardsCallback) {

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
                    var errorResponse = JSON.parse(body);
                    callback(errorResponse.error, null);
                }
            });
    }

    createTransaction(
        fromCard: string,
        amount: number,
        currency: string,
        recipient: string,
        callback: IBitReserveTransactionCallback) {

        // denomination[currency]=BTC&denomination[amount]=0.1&destination=foo@bar.com
        request.post('https://api.bitreserve.org/v0/me/cards/' + fromCard + '/transactions',
            {
                headers: {
                    "Authorization": "Bearer " + this.authorizationToken
                },                
                form: {
                    'denomination[currency]': currency,
                    'denomination[amount]': amount,
                    'destination': recipient
                }
            }, function (error, response, body) {
                if (!error && ('' + response.statusCode).match(/^2\d\d$/)) {
                    // Transaction created
                    callback(null, <IBitReserveTransaction>JSON.parse(body));
                } else {
                    console.log("Error creating transaction: " + error);
                    var errorResponse = JSON.parse(body);

                    callback(errorResponse, null);
                }
            });

    }

    commitTransaction(transaction: IBitReserveTransaction, callback: IBitReserveTransactionCallback) {
        // POST https://api.bitreserve.org/v0/me/cards/:card/transactions/:id/commit

        request.post('https://api.bitreserve.org/v0/me/cards/' + transaction.origin.CardId
            + '/transactions/' + transaction.id + '/commit',
            {
                headers: {
                    "Authorization": "Bearer " + this.authorizationToken
                },
            }, function (error, response, body) {
                if (!error && ('' + response.statusCode).match(/^2\d\d$/)) {
                    // Transaction committed
                    callback(null, <IBitReserveTransaction>JSON.parse(body));
                } else {
                    console.log("Error confirming transaction: " + error);
                    var errorResponse = JSON.parse(body);

                    callback(errorResponse, null);
                }
            });

    }
}