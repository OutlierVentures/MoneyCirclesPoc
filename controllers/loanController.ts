import express = require("express");
import circleModel = require('../models/circleModel');
import userModel = require('../models/userModel');
import loanModel = require('../models/loanModel');
import web3plus = require('../node_modules/web3plus/lib/web3plus');
import bitReserveService = require('../services/bitReserveService');
import serviceFactory = require('../services/serviceFactory');
import _ = require('underscore');

var enhanceLoanData = function (l: loanModel.ILoan) {
    if (l.interestPercentage == undefined) {
        l.interestPercentage = 0;
    }

    l.amountToRepay = (1 + l.interestPercentage / 100) * l.amount;
}


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
                        _(loans).each(enhanceLoanData);

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
                        enhanceLoanData(loan);
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

        var vaultAddress = t.config.bitReserve.circleVaultAccount.cardBitcoinAddress;

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
                return;
            } 

            // Get the loans of the user
            loanModel.Loan.findOne({ _id: loanData._id })
                .populate("circleId")
                .exec()
                .then(function (loan) {
                    enhanceLoanData(loan);

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
                            return;
                        } 
                                                     
                        // Get loan repayment info through the sub contract
                        var loanContractDefinition = circleContract.allContractTypes.Loan.contractDefinition;
                        var loanContract = loanContractDefinition.at(loan.contractAddress);

                        if (loanContract.isRepaid()) {
                            res.status(500).json({
                                "error": "This loan has already been repaid.",
                                "error_location": "creating transaction"
                            });
                            return;
                        }


                        var brs = serviceFactory.createBitreserveService(token);
                                       
                        // 1. Create the BitReserve transaction                 
                        brs.createTransaction(fromCard, loan.amountToRepay, loan.currency, vaultAddress, (createErr, createRes) => {
                            if (createErr) {
                                res.status(500).json({
                                    "error": createErr,
                                    "error_location": "creating transaction"
                                });
                                return;
                            }

                            // 2. Commit the BitReserve transaction
                            brs.commitTransaction(createRes, (commitErr, commitRes) => {
                                if (commitErr) {
                                    res.status(500).json({
                                        "error": commitErr,
                                        "error_location": "committing transaction"
                                    });
                                    return;
                                }

                                // 3. Set the contract as paid
                                circleContract.setRepaid(loan.contractAddress, commitRes.id, { gas: 2500000 })
                                    .then(web3plus.promiseCommital)
                                    .then(function afterSetRepaid(tx) {
                                        // At this point the loan contract should report that it has been repaid.
                                        if (!loanContract.isRepaid()) {
                                            res.status(500).json({
                                                "error": "There was a problem registering your repayment. The Bitreserve transaction has completed succesfully and the transaction ID is " + commitRes.id,
                                                "error_location": "committing transaction"
                                            });
                                            return;
                                        }

                                        // 4. Store the tx ID in the loan db storage.
                                        loan.repaymentTransactionId = commitRes.id;

                                        loan.save(function (loanTxSaveErr, loanTxSaveRes) {
                                            if (loanTxSaveErr) {
                                                res.status(500).json({
                                                    "error": loanTxSaveErr,
                                                    "error_location": "saving transaction ID to loan"
                                                });
                                                return;
                                            }
                                            // All done. Return database loan.
                                            res.json(loan);
                                        });
                                    })
                                    .catch(function (setPaidError) {
                                        res.status(500).json({
                                            "error": setPaidError,
                                            "error_location": "setting loan contract as paid"
                                        });
                                    });
                            });
                        });
                    });
                }, function (loanErr) {
                    res.status(500).json({
                        "error": loanErr,
                        "error_location": "getting loan data",
                    });
                });
        });
    }
}
