import express = require("express");
import circleModel = require('../models/circleModel');
import userModel = require('../models/userModel');
import depositModel = require('../models/depositModel');
import loanModel = require('../models/loanModel');
import bitReserveService = require('../services/bitReserveService');
import _ = require('underscore');

/**
 * Controller for Circle membership operations.
 */
export class CircleMemberController {
    private config: IApplicationConfig;
    /** 
     * The simple-oauth2 module, which has no typings.
     */
    private oauth2;

    private authorization_uri: string;

    constructor(configParam: IApplicationConfig) {
        this.config = configParam;
    }

    getAll = (req: express.Request, res: express.Response) => {
        var token = req.header("AccessToken");

        circleModel.Circle.find({}, (err, circleRes) => {
            res.send(circleRes);
        });
    }

    getOne = (req: express.Request, res: express.Response) => {
        var token = req.header("AccessToken");

        circleModel.Circle.findOne({ _id: req.params.id }, (err, circleRes) => {
            res.send(circleRes);
        });
    }

    join = (req: express.Request, res: express.Response) => {
        var token = req.header("AccessToken");

        var circleData = <circleModel.ICircle>req.body;

        userModel.getUserByAccessToken(token, function (userErr, userRes) {
            if (userErr) {
                res.status(500).json({
                    "error": userErr,
                    "error_location": "getting user data",
                    "status": "Error",
                });
            } else {
                // Add the user to this circle
                var user = <userModel.IUser>userRes;

                // Check for existing membership
                if (user.circleMemberships.some(
                    (value, index, arr) => {
                        // TODO: use ObjectID for circleID (and Mongoose populate())
                        return value.circleId === circleData._id.toString() && !value.endDate;
                    })) {
                    res.status(500).json({
                        "error": "User is already a member of this circle",
                        "error_location": "joining circle",
                        "status": "Error",
                    });
                } else {
                    var cm = new userModel.CircleMembership();
                    cm.circleId = circleData._id.toString();
                    cm.startDate = new Date();
                    user.circleMemberships.push(cm);

                    user.save(function (saveErr, saveRes) {
                        if (saveErr) {
                            res.status(500).json({
                                "error": saveErr,
                                "error_location": "saving user data",
                                "status": "Error",
                            });
                        } else {
                            res.status(200).json(saveRes);
                        }
                    });
                }
            }
        });
    }

    deposit = (req: express.Request, res: express.Response) => {
        var token = req.header("AccessToken");

        var circleId = req.params.id;

        var depositData = <depositModel.IDeposit>req.body;

        var adminAccount = this.config.bitReserve.mainAccount.userName;

        var brs = new bitReserveService.BitReserveService(token);

        // Create the transaction
        brs.createTransaction(depositData.fromCard, depositData.amount, depositData.currency, adminAccount, (createErr, createRes) => {
            if (createErr) {
                res.status(500).json({
                    "error": createErr,
                    "error_location": "creating transaction"
                });
            }
            else {
                // Commit it
                brs.commitTransaction(createRes, (commitErr, commitRes) => {
                    if (commitErr) {
                        res.status(500).json({
                            "error": commitErr,
                            "error_location": "committing transaction"
                        });
                    } else {
                        // Store it in our transaction history.

                        // Note: this method is very fragile. Any transaction to the value store should be atomically stored
                        // on our side. This could be realized when the value store of a circle has an individual BitReserve
                        // identity. Storage of the transaction then doesn't have to be completed in this request, but could
                        // be done by an idempotent background process.
                        var dep = new depositModel.Deposit();

                        // Get our user info
                        userModel.getUserByAccessToken(token,
                            (userErr, userRes) => {
                                if (userErr) {
                                    res.status(500).json({
                                        "error": commitErr,
                                        "error_location": "getting user data to store transaction"
                                    });
                                }
                                else {
                                    dep.amount = commitRes.denomination.amount;
                                    dep.currency = depositData.currency;
                                    dep.dateTime = commitRes.createdAt;
                                    dep.fromCard = depositData.fromCard;
                                    dep.circleId = circleId;
                                    dep.transactionId = commitRes.id;
                                    dep.userId = userRes._id;
                                    dep.save();

                                    res.json(dep);
                                }
                            });
                    }
                });
            }
        });
    }

    loan = (req: express.Request, res: express.Response) => {
        var token = req.header("AccessToken");

        var circleId = req.params.id;

        var loanData = <loanModel.ILoan>req.body;

        var adminAccount = this.config.bitReserve.mainAccount.userName;

        // TODO: check whether circle balance allows for this loan
        // TODO: various other checks to see if loan is approved (credit rating, admin approval, ...)

        // Get admin user
        userModel.User.findOne({ externalId: adminAccount }, (adminUserErr, adminUserRes) => {
            if (adminUserErr) {
                res.status(500).json({
                    "error": adminUserErr,
                    "error_location": "getting user info"
                });

            } else {
                // Create BitReserve connector for global admin user.
                var brs = new bitReserveService.BitReserveService(adminUserRes.accessToken);

                // Get card to transfer from. For now: take the first card with enough balance.
                // TODO: create and configure 1 card per circle?
                brs.getCards((cardsErr, cardsRes) => {
                    if (cardsErr) {
                        res.status(500).json({
                            "error": cardsErr,
                            "error_location": "getting cards"
                        });
                    }
                    else {
                        // We can't compare the amounts, as 
                        var firstCardWithBalance = _(cardsRes).find((c) => {
                            return c.normalized[0].available > loanData.amount;
                        });

                        if (firstCardWithBalance == null) {
                            res.status(500).json({
                                "error": "no card with enough balance",
                                "error_location": "getting card for loan payment"
                            });

                        } else {
                            // Get logged in user info
                            userModel.getUserByAccessToken(token,
                                (userErr, userRes) => {
                                    if (userErr) {
                                        res.status(500).json({
                                            "error": userErr,
                                            "error_location": "getting user data to store loan"
                                        });
                                    }
                                    else {
                                        // Create the transaction.
                                        brs.createTransaction(firstCardWithBalance.id, loanData.amount, loanData.currency, userRes.externalId, (createErr, createRes) => {
                                            if (createErr) {
                                                res.status(500).json({
                                                    "error": createErr,
                                                    "error_location": "creating transaction"
                                                });
                                            }
                                            else {
                                                // Commit it
                                                brs.commitTransaction(createRes, (commitErr, commitRes) => {
                                                    if (commitErr) {
                                                        res.status(500).json({
                                                            "error": commitErr,
                                                            "error_location": "committing transaction"
                                                        });
                                                    } else {
                                                        // Store it in our loan storage.
                                                        var loan = new loanModel.Loan();

                                                        loan.amount = commitRes.denomination.amount;
                                                        loan.currency = loanData.currency;
                                                        loan.purpose = loanData.purpose;
                                                        loan.dateTime = commitRes.createdAt;
                                                        loan.circleId = circleId;
                                                        loan.transactionId = commitRes.id;
                                                        loan.userId = userRes._id;
                                                        loan.save();

                                                        res.json(loan);
                                                    }
                                                });
                                            }
                                        });
                                    }
                                });
                        }
                    }

                });

            }
        });






    }
}