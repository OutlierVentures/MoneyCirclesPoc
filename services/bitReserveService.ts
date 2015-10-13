﻿import request = require('request');
import userModel = require('../models/userModel');

// Enable request debugging
// TODO: make configurable (config debug option)
require('request').debug = true;

export interface IBitReserveTransaction {
    "id": string,
    "type": string,
    "message": string,
    "status": string,
    "RefundedById": string,
    "createdAt": string,
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
    "lastTransactionAt": string,
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

export interface IBitReserveTransactionCallback {
    (error: any, transaction: IBitReserveTransaction);
}

export interface IBitReserveTransactionsCallback {
    (error: any, transactions: IBitReserveTransaction[]);
}

export interface IBitReserveCardsCallback {
    (error: any, cards: Array<IBitReserveCard>);
}

export interface IBitReserveCardCallback {
    (error: any, card: IBitReserveCard);
}

/**
 * Handle an error for a call to the Bitreserve API.
 */
function handleBitreserveApiError(error, body, callback) {
    var errorResponse;
    try {
        if (body) {
            errorResponse = JSON.parse(body);
            if (errorResponse.error)
                errorResponse = errorResponse.error;
        }
        else
            errorResponse = error;
    }
    catch (e) {
        errorResponse = error;
    }
    // Ensure that errorResponse is not falsey so callback is always handled as error.
    if (!errorResponse)
        errorResponse = "Unknown error";

    callback(errorResponse, null);
}

function isSuccessStatusCode(statusCode: number): boolean {
    if (('' + statusCode).match(/^2\d\d$/))
        return true;
    return false;
}

export class BitReserveService {
    constructor(
        private authorizationToken: string) {
    }

    /**
     * Gets info about the current user.
     */
    getUser = (callback) => {
        console.log("Calling API with token: " + this.authorizationToken);
        request.get('https://api.bitreserve.org/v0/me',
            {
                headers: {
                    "Authorization": "Bearer " + this.authorizationToken
                }
            }, function (error, response, body) {
                if (!error && isSuccessStatusCode(response.statusCode)) {
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

    getCards = (callback: IBitReserveCardsCallback) => {

        console.log("Calling API with token: " + this.authorizationToken);
        request.get('https://api.bitreserve.org/v0/me/cards',
            {
                headers: {
                    "Authorization": "Bearer " + this.authorizationToken
                }
            }, function (error, response, body) {
                if (!error && isSuccessStatusCode(response.statusCode)) {
                    var cards = JSON.parse(body);

                    callback(null, cards);
                } else {
                    console.log("Error getting cards data: " + error);
                    handleBitreserveApiError(error, body, callback);
                }
            });
    }

    getCardTransactions = (cardId: string, callback: IBitReserveTransactionsCallback) => {
        request.get('https://api.bitreserve.org/v0/me/cards/' + cardId + '/transactions',
            {
                headers: {
                    "Authorization": "Bearer " + this.authorizationToken
                }
            }, function (error, response, body) {
                if (!error && isSuccessStatusCode(response.statusCode)) {
                    var transactions = JSON.parse(body);

                    callback(null, transactions);
                } else {
                    console.log("Error getting cards data: " + error);
                    handleBitreserveApiError(error, body, callback);
                }
            });
    }

    /**
     * Create a new card.
     */
    createCard = (label: string, callback: IBitReserveCardCallback) => {
        console.log("Calling API with token: " + this.authorizationToken);
        request.post('https://api.bitreserve.org/v0/me/cards',
            {
                headers: {
                    "Authorization": "Bearer " + this.authorizationToken
                },
                json: {
                    "label": label,
                    "currency": "GBP"
                }
            }, function (error, response, body) {
                if (!error && isSuccessStatusCode(response.statusCode)) {
                    // In this case the request module returns the data as already parsed. 
                    // Possibly because the request is done with the 'json' parameter.
                    var card = body;

                    callback(null, card);
                } else {
                    console.log("Error creating card: " + error);
                    handleBitreserveApiError(error, body, callback);
                }
            });
    }

    createTransaction = (
        fromCard: string,
        amount: number,
        currency: string,
        recipient: string,
        callback: IBitReserveTransactionCallback) => {

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
                if (!error && isSuccessStatusCode(response.statusCode)) {
                    // Transaction created
                    callback(null, <IBitReserveTransaction>JSON.parse(body));
                } else {
                    handleBitreserveApiError(error, body, callback);
                }
            });

    }

    commitTransaction = (transaction: IBitReserveTransaction, callback: IBitReserveTransactionCallback) => {
        // POST https://api.bitreserve.org/v0/me/cards/:card/transactions/:id/commit

        request.post('https://api.bitreserve.org/v0/me/cards/' + transaction.origin.CardId
            + '/transactions/' + transaction.id + '/commit',
            {
                headers: {
                    "Authorization": "Bearer " + this.authorizationToken
                },
            }, function (error, response, body) {
                if (!error && isSuccessStatusCode(response.statusCode)) {
                    // Transaction committed
                    callback(null, <IBitReserveTransaction>JSON.parse(body));
                } else {
                    console.log("Error confirming transaction: " + error);
                    handleBitreserveApiError(error, body, callback);
                }
            });

    }
}