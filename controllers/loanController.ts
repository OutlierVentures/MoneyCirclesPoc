import express = require("express");
import circleModel = require('../models/circleModel');
import userModel = require('../models/userModel');
import loanModel = require('../models/loanModel');
import web3plus = require('../node_modules/web3plus/lib/web3plus');

/**
 * Controller for Circle admin operations.
 */
export class LoanController {
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

        userModel.getUserByAccessToken(token, function (userErr, userRes) {
            if (userErr) {
                res.status(500).json({
                    "error": userErr,
                    "error_location": "getting user data",
                });
            } else {
                // Get the loan
                loanModel.Loan.findOne({ userId: userRes._id })
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
                        // TODO: process repayment    
                        res.status(500).json({
                            "error": "not implemented",
                            "error_location": "getting loan data",
                        });
                        return;
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
}
