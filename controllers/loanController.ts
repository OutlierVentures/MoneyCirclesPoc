import express = require("express");
import circleModel = require('../models/circleModel');
import userModel = require('../models/userModel');
import loanModel = require('../models/loanModel');
import web3plus = require('../node_modules/web3plus/lib/web3plus');
import bitReserveService = require('../services/bitReserveService');

/**
 * Controller for Circle admin operations.
 */
export class LoanController {
    private config: IApplicationConfig;

    constructor(configParam: IApplicationConfig) {
        this.config = configParam;
    }

    /**
     * Get the loans of a user
     */
    getAll = (req: express.Request, res: express.Response) => {
        var token = req.header("AccessToken");

        userModel.getUserByAccessToken(token, function (userErr, userRes) {
            if (userErr) {
                res.status(500).json({
                    "error": userErr,
                    "error_location": "getting user data",
                });
            } else {
                // Get the loans of the user
                loanModel.Loan.find({ userId: userRes._id })
                    .populate('circleId')
                    .exec()
                    .then(function (loans) {
                        res.json(loans);
                    }, function (loanErr) {
                        res.status(500).json({
                            "error": loanErr,
                            "error_location": "getting loan data",
                        });
                    });
            }
        });
    }

    /**
     * Get a single loans of a user
     */
    getOne = (req: express.Request, res: express.Response) => {
        var token = req.header("AccessToken");
        var loanId = req.param("id");

        userModel.getUserByAccessToken(token, function (userErr, userRes) {
            if (userErr) {
                res.status(500).json({
                    "error": userErr,
                    "error_location": "getting user data",
                });
            } else {
                // Get the loan
                loanModel.Loan.findOne({ _id: loanId })
                    .populate('circleId')
                    .exec()
                    .then(function (loan) {
                        res.json(loan);
                    }, function (loanErr) {
                        res.status(500).json({
                            "error": loanErr,
                            "error_location": "getting loan data",
                        });
                    });
            }
        });
    }

    /**
     * Repay a single loan
     */
    repay = (req: express.Request, res: express.Response) => {
        var token = req.header("AccessToken");
        var loanData = req.body;
        var t = this;

        // Another bit of working around type safety: the request contains a parameter 
        // not present in the Loan entity. Get it out untyped.
        var fromCard = req.body.repayFromCard;
        req.body.fromCard = undefined;

        // Sequence for repayments:
        // 1. Create BitReserve transaction
        // 2. Commit BitReserve transaction
        // 3. Store it in the Loan contract
        // 4. Store it in the Loan database item

        userModel.getUserByAccessToken(token, function (userErr, userRes) {
            if (userErr) {
                res.status(500).json({
                    "error": userErr,
                    "error_location": "getting user data",
                });
            } else {
                // Get the loans of the user
                loanModel.Loan.findOne({ _id: loanData._id }).exec()
                    .then(function (loan) {

                    if (!loan.contractAddress) {
                        // Early testing loan, no contract
                        res.status(500).json({
                            "error": "can't find the smart contract for this loan",
                            "error_location": "loading loan",
                        });

                        return;
                    }

                    // The loan object is populated, and hence doesn't satisfy ICircle any more.
                    // loan.circleId is an ICircle. That's why we cast it to ICircle as a
                    // separate variable.
                    var circle: ICircle = <ICircle><any>loan.circleId

                    // Load the contract
                    var circleContract = web3plus.loadContractFromFile('Circle.sol', 'Circle', circle.contractAddress, true, function (loadContractError, circleContract) {
                        if (loadContractError) {
                            res.status(500).json({
                                "error": loadContractError,
                                "error_location": "loading circle contract",
                            });
                        } else {
                            var brs = new bitReserveService.BitReserveService(token);
                                       
                            // 1. Create the BitReserve transaction                 
                            brs.createTransaction(fromCard, loan.amount, loan.currency, t.config.bitReserve.circleVaultAccount.userName, (createErr, createRes) => {
                                if (createErr) {
                                    res.status(500).json({
                                        "error": createErr,
                                        "error_location": "creating transaction"
                                    });
                                }
                                else {

                                    // 2. Commit the BitReserve transaction
                                    brs.commitTransaction(createRes, (commitErr, commitRes) => {
                                        if (commitErr) {
                                            res.status(500).json({
                                                "error": commitErr,
                                                "error_location": "committing transaction"
                                            });
                                        } else {

                                            // 3. Set the contract as paid
                                            circleContract.setPaidOut(loan.contractAddress, commitRes.id, { gas: 2500000 })
                                                .then(web3plus.promiseCommital)
                                                .then(function afterSetRepayd(tx) {
                                                    // 4. Store the tx ID in the loan db storage.
                                                    loan.repaymentTransactionId = commitRes.id;
                                                    loan.save(function (loanTxSaveErr, loanTxSaveRes) {
                                                        if (loanTxSaveErr) {
                                                            res.status(500).json({
                                                                "error": loanTxSaveErr,
                                                                "error_location": "saving transaction ID to loan"
                                                            });
                                                        }
                                                        else {
                                                            // All done. Return database loan.
                                                            res.json(loan);
                                                        }
                                                    });
                                                })
                                                .catch(function (setPaidError) {
                                                    res.status(500).json({
                                                        "error": setPaidError,
                                                        "error_location": "setting loan contract as paid"
                                                    });

                                                });
                                        }
                                    });

                                }
                            });

                        }

                    });



                    }, function (loanErr) {
                        res.status(500).json({
                            "error": loanErr,
                            "error_location": "getting loan data",
                        });
                    });
            }
        });
    }
}
