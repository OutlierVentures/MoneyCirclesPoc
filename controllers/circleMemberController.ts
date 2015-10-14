import express = require("express");
import circleModel = require('../models/circleModel');
import userModel = require('../models/userModel');
import depositModel = require('../models/depositModel');
import loanModel = require('../models/loanModel');
import bitReserveService = require('../services/bitReserveService');
import serviceFactory = require('../services/serviceFactory');
import circleService = require('../services/circleService');
import web3plus = require('../node_modules/web3plus/lib/web3plus');
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

        circleModel.Circle.find({}, (err, circleList) => {
            userModel.getUserByAccessToken(token, function (userErr, user) {
                if (userErr) {
                    res.status(500).json({
                        "error": userErr,
                        "error_location": "getting user data",
                        "status": "Error",
                    });
                    return;
                } 

                // Add property to show whether user is a member

                _(circleList).each(function (circle) {
                    // Check for existing membership
                    if (user.circleMemberships.some(
                        (value, index, arr) => {
                            return value.circleId.toString() == circle.id && !value.endDate;
                        })) {
                        var circleAny: any;
                        circleAny = circle;
                        // Set the custom property on the _doc, so that it will be serialized.
                        circleAny._doc.userIsMember = true;
                    }
                    });

                res.json(circleList);
        });
        });
    }


    getOne = (req: express.Request, res: express.Response) => {
        var token = req.header("AccessToken");

        circleModel.Circle.findOne({ _id: req.params.id }).exec()
            .then((circle) => {
                res.send(circle);
            }, (circleErr) => {
                res.status(500).json({
                    "error": circleErr,
                    "error_location": "getting circle data",
                    "status": "Error",
                });
            });
    }

    getStatistics = (req: express.Request, res: express.Response) => {
        var token = req.header("AccessToken");

        var cs = new circleService.CircleService(token);

        cs.getCircleStatistics(req.params.id)
            .then((stats) => {
                res.json(stats);
            })
            .catch((err) => {
                res.status(500).json({
                    "error": err,
                    "error_location": "getting circle statistics"
                });
            });
    }

    getMembers = (req: express.Request, res: express.Response) => {
        var token = req.header("AccessToken");

        var cs = new circleService.CircleService(token);

        // TODO: implement
        //cs.getCircleStatistics(req.params.id)
        //    .then((stats) => {
        //        res.json(stats);
        //    })
        //    .catch((err) => {
        //        res.status(500).json({
        //            "error": err,
        //            "error_location": "getting circle statistics"
        //        });
        //    });
    }

    join = (req: express.Request, res: express.Response) => {
        var token = req.header("AccessToken");

        // Load the full circle data
        var circleData = <circleModel.ICircle>req.body;
        circleModel.Circle.findOne({ _id: circleData._id }).exec()
            .then((circle) => {

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
                                return value.circleId.toString() == circle.id && !value.endDate;
                            })) {
                            res.status(500).json({
                                "error": "User is already a member of this circle",
                                "error_location": "joining circle",
                                "status": "Error",
                            });
                        } else {
                            // 1. Add to the Contract
                            var circleContract = web3plus.loadContractFromFile('Circle.sol', 'Circle', circle.contractAddress, true, function (loadContractError, circleContract) {
                                if (loadContractError) {
                                    res.status(500).json({
                                        "error": loadContractError,
                                        "error_location": "loading circle contract",
                                    });
                                } else {
                                    // We need to call user._id.toString() to prevent it being passed as ObjectId,
                                    // which web3 doesn't know how to handle.
                                    circleContract.addMember(user._id.toString(), user.externalId, { gas: 2500000 })
                                        .then(web3plus.promiseCommital)
                                        .then(function (tx) {
                                            // 2. Register in MongoDB

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
                                        })
                                        .catch(function (addMemberToContractError) {
                                            res.status(500).json({
                                                "error": addMemberToContractError,
                                                "error_location": "adding member to circle contract",
                                                "status": "Error",
                                            });

                                        });
                                }

                            });


                        }
                    }
                });
            },
                function (loadCircleError) {
                    res.status(500).json({
                        "error": loadCircleError,
                        "error_location": "saving user data",
                        "status": "Error",
                    });

                });
    }

    deposit = (req: express.Request, res: express.Response) => {
        var token = req.header("AccessToken");

        var circleId = req.params.id;

        var depositData = <depositModel.IDeposit>req.body;

        var vaultAddress = this.config.bitReserve.circleVaultAccount.cardBitcoinAddress;

        var brs = serviceFactory.createBitreserveService(token);

        // Sequence:
        // 1. Create the Uphold transaction
        // 2. Commit the Uphold transaction
        // 3. Register the deposit in the contract
        // 4. Register the deposit in MongoDB

        // Get our user info
        userModel.getUserByAccessToken(token, (userErr, userRes) => {
            if (userErr) {
                res.status(500).json({
                    "error": userErr,
                    "error_location": "getting user data to store transaction"
                });
                return;
            }

            // Is the user a member? Check this to prevent doing a BR transaction and 
            // finding out the user isn't a member afterwards.
            if (!_(userRes.circleMemberships).any((cm) => {
                return cm.circleId == circleId;
            })) {
                // Not a member.
                res.status(500).json({
                    "error": "User is not a member of this Circle.",
                    "error_location": "checking user membership"
                });
                return;
            }

            // 1. Create the transaction
            brs.createTransaction(depositData.fromCard, depositData.amount, depositData.currency, vaultAddress, (createErr, createRes) => {
                if (createErr) {
                    res.status(500).json({
                        "error": createErr,
                        "error_location": "creating transaction"
                    });
                    return;
                }
                    
                // 2. Commit it
                brs.commitTransaction(createRes, (commitErr, commitRes) => {
                    if (commitErr) {
                        res.status(500).json({
                            "error": commitErr,
                            "error_location": "committing transaction"
                        });
                        return;
                    }

                    // Get the Circle data
                    circleModel.Circle.findOne({ _id: circleId }, function (loadCircleErr, circle) {
                        if (loadCircleErr) {
                            res.status(500).json({
                                "error": loadCircleErr,
                                "error_location": "loading Circle data"
                            });
                            return;
                        }

                        var circleContract = web3plus.loadContractFromFile('Circle.sol', 'Circle', circle.contractAddress, true, function processCircleContract(circleContractErr, circleContract) {
                            var lastDepositIndex = circleContract.depositIndex().toNumber();

                            // Amounts in the contract are stored as cents/pence.
                            // Hence multiply * 100.
                            // 3. Register the deposit in the contract.
                            circleContract.createDeposit(userRes._id.toString(), depositData.amount * 100, commitRes.id, { gas: 2500000 })
                                .then(web3plus.promiseCommital)
                                .then(function processLoanContract(tx) {
                                    // Loan contract was created.
                                    // At this point we only have the transaction info. We assume that the last loan
                                    // created is our loan.
                                    // TODO: Get the address of the newly created in a more robust way.
                                    // Possibly use Solidity events.
                                    var depositIndex = circleContract.depositIndex().toNumber();

                                    // We do check whether a single loan was created since our call.
                                    // Ways in which this could be incorrect:
                                    // 1. False success: Our call failed, but another call succeeded in the mean time.
                                    // 2. False failure: our call succeeded, but one or more other calls succeeded in
                                    // the mean time.
                                    if (depositIndex != lastDepositIndex + 1) {
                                        res.status(500).json({
                                            "error": "Your deposit was not registered. The Uphold transaction ID is: " + commitRes.id,
                                            "error_location": "creating loan contract"
                                        });
                                        return;
                                    }
                                    
                                    // 4. Register the deposit in MongoDB.

                                    // Note: this method is very fragile. Any transaction to the value store should be atomically stored
                                    // on our side. This could be realized when the value store of a circle has an individual Uphold
                                    // identity. Storage of the transaction then doesn't have to be completed in this request, but could
                                    // be done by an idempotent background process.
                                    var dep = new depositModel.Deposit();

                                    dep.amount = commitRes.denomination.amount;
                                    dep.currency = depositData.currency;
                                    // The date is parsed and stored in MongoDB as a $date.
                                    dep.dateTime = new Date(commitRes.createdAt);
                                    dep.fromCard = depositData.fromCard;
                                    dep.circleId = circleId;
                                    // We need to store a 1:1 reference to the deposit in the contract. As Deposits
                                    // are not separate contracts in themselves, we store the depositIndex.
                                    dep.depositIndex = depositIndex;
                                    dep.transactionId = commitRes.id;
                                    dep.userId = userRes.id;
                                    dep.save();

                                    res.json(dep);
                                })
                                .catch(function (createDepositError) {
                                    res.status(500).json({
                                        "error": createDepositError,
                                        "error_location": "registering deposit in contract"
                                    });
                                });
                        });
                    });
                });
            });

        });
    }

    loan = (req: express.Request, res: express.Response) => {
        var token = req.header("AccessToken");

        var circleId = req.params.id;

        var loanData = <loanModel.ILoan>req.body;

        var adminAccount = this.config.bitReserve.circleVaultAccount.userName;
        var vaultCardId = this.config.bitReserve.circleVaultAccount.cardId;

        // Steps:
        // 1. Create Uphold transaction from the global vault to the borrower
        // 2. Create Loan smart contract by calling the Circle contract
        // 3. Store in MongoDB
        // 4. Store Uphold transaction ID with loan contract.
        // 5. Store Uphold transaction ID in MongoDB.
        // 6. Confirm Uphold transaction (or not if the Loan contract denies)

        // Rationale: the Circle Loan contract is the primary judge of whether the loan
        // is allowed (1). If it is, we want to store the new contract address ASAP (2).

        // The payout could principal/y be done by another service independent
        // of the app. It would idempotently scan all Loans that aren't payed
        // out, then carry out steps. However it would also need the ability
        // to update the loan amount as there can be a rounding difference.

        // TODO: check whether circle balance allows for this loan
        // TODO: various other checks to see if loan is approved (credit rating, admin approval, ...)

        // TODO: convert to promises or otherwise flatten this code. Can you say "callback hell"?

        // Get logged in user info
        userModel.getUserByAccessToken(token,
            (userErr, userRes) => {
                if (userErr) {
                    res.status(500).json({
                        "error": userErr,
                        "error_location": "getting user data to store loan"
                    });
                    return;
                }
                
                // Get global Circle Vault account
                userModel.User.findOne({ externalId: adminAccount }).exec()
                    .then((adminUserRes) => {
                        // Create Uphold connector for global admin user.
                        var brs = serviceFactory.createBitreserveService(adminUserRes.accessToken);

                        // Create the transaction.
                        brs.createTransaction(vaultCardId, loanData.amount, loanData.currency, userRes.externalId, (createErr, createRes) => {
                            if (createErr) {
                                res.status(500).json({
                                    "error": createErr,
                                    "error_location": "creating transaction"
                                });
                                return;
                            }

                            circleModel.Circle.findOne({ _id: circleId }, function (loadCircleErr, circle) {
                                if (loadCircleErr) {
                                    res.status(500).json({
                                        "error": loadCircleErr,
                                        "error_location": "loading Circle data"
                                    });
                                    return;
                                }

                                var circleContract = web3plus.loadContractFromFile('Circle.sol', 'Circle', circle.contractAddress, true, function processCircleContract(circleContractErr, circleContract) {
                                    var lastLoanIndex = circleContract.loanIndex().toNumber();

                                    // Amounts in the contract are stored as cents/pence.
                                    // Hence multiply * 100.
                                    circleContract.createLoan(userRes._id.toString(), loanData.amount * 100, { gas: 2500000 })
                                        .then(web3plus.promiseCommital)
                                        .then(function processLoanContract(tx) {
                                            // Loan contract was created.
                                            // At this point we only have the transaction info. We assume that the last loan
                                            // created is our loan.
                                            // TODO: Get the address of the newly created in a more robust way.
                                            // Possibly use Solidity events.
                                            var loanIndex = circleContract.loanIndex().toNumber();

                                            // We do check whether a single loan was created since our call.
                                            // Ways in which this could be incorrect:
                                            // 1. False success: Our call failed, but another call succeeded in the mean time.
                                            // 2. False failure: our call succeeded, but one or more other calls succeeded in
                                            // the mean time.
                                            if (loanIndex != lastLoanIndex + 1) {
                                                res.status(500).json({
                                                    "error": "Your loan was not approved. Possibly the reserves of the Circle are too low to allow your loan.",
                                                    "error_location": "creating loan contract"
                                                });
                                                return;
                                            }

                                            var newLoanAddress = circleContract.loans(loanIndex);

                                            // Get loan sub contract
                                            var loanContractDefinition = circleContract.allContractTypes.Loan.contractDefinition;
                                            var loanContract = loanContractDefinition.at(newLoanAddress);

                                            // Store it in our loan storage.
                                            var loan = new loanModel.Loan();

                                            // Store the exact amount from the transaction. Uphold
                                            // rounds amounts like 0.005 to 0.01.
                                            loan.amount = createRes.denomination.amount;
                                            loan.contractAddress = loanContract.address;
                                            loan.currency = loanData.currency;
                                            loan.purpose = loanData.purpose;
                                            loan.interestPercentage = circle.interestPercentage;
                                            loan.dateTime = new Date();
                                            loan.circleId = circleId;
                                            loan.userId = userRes.id;
                                            loan.save(function (loanSaveErr, loanSaveRes) {
                                                if (loanSaveErr) {
                                                    res.status(500).json({
                                                        "error": loanSaveErr,
                                                        "error_location": "saving loan"
                                                    });
                                                    return;
                                                } 

                                                // Commit the Uphold transaction
                                                brs.commitTransaction(createRes, (commitErr, commitRes) => {
                                                    if (commitErr) {
                                                        res.status(500).json({
                                                            "error": commitErr,
                                                            "error_location": "committing transaction"
                                                        });
                                                        return;
                                                    } 

                                                    // Set the contract as paid
                                                    circleContract.setPaidOut(newLoanAddress, commitRes.id, { gas: 2500000 })
                                                        .then(web3plus.promiseCommital)
                                                        .then(function afterSetPaid(tx) {
                                                            // Store the tx ID in the loan db storage.
                                                            loan.transactionId = commitRes.id;
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
                                        })
                                        .catch(function (createLoanError) {
                                            res.status(500).json({
                                                "error": createLoanError,
                                                "error_location": "creating loan contract"
                                            });
                                        });
                                });
                            });
                        });
                    },
                        function (loadUserErr) {
                            res.status(500).json({
                                "error": loadUserErr,
                                "error_location": "loading circle vault"
                            });

                        });
            });
    }
}
