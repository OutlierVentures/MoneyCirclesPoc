import express = require("express");
import circleModel = require('../models/circleModel');
import userModel = require('../models/userModel');
import depositModel = require('../models/depositModel');
import loanModel = require('../models/loanModel');
import circleService = require('../services/circleService');
import bitReserveService = require('../services/bitReserveService');
import serviceFactory = require('../services/serviceFactory');
import web3plus = require('../node_modules/web3plus/lib/web3plus');
import _ = require('underscore');
import Q = require('q');

interface IAuditList {
    items: IAuditListItem[],
    totals: ICircleStatistics
}

interface IAuditListItem {
    circle: circleModel.ICircle,
    statistics: ICircleStatistics
}

interface IAuditDetails {
    circle: circleModel.ICircle,
    statistics: ICircleStatistics,
    loans: [loanModel.ILoan],
    deposits: [depositModel.IDeposit]
}

interface ICircleVaultStatistics {
    balance: number,
    transactions: bitReserveService.IBitReserveTransaction[]
    totals: {
        debitAmount: number,
        creditAmount: number
    }
}

interface IApplicationInfo {
    blockchain: {
        nodeUrl: string,
        smartContractSourceCode: string,
        genesisBlock: any
    }
}

/**
 * Controller for Circle membership operations.
 */
export class AuditController {
    private config: IApplicationConfig;

    constructor(configParam: IApplicationConfig) {
        this.config = configParam;
    }

    getList = (req: express.Request, res: express.Response) => {
        // This is an anonymous method.
        // var token = req.header("AccessToken");
        var cs = new circleService.CircleService(null);

        // Load all circles
        circleModel.Circle.find({}).exec()
            .then(function (circles) {
                // Load stats for all of them.

                var getStatsPromises = new Array<Q.Promise<ICircleStatistics>>();

                _(circles).each((circle) => {
                    function getEmptyStats() {
                        var deferred = Q.defer<ICircleStatistics>();
                        deferred.resolve(<ICircleStatistics>{});
                        return deferred.promise;
                    }

                    // For old contracts without a contract address we generate an empty set of stats.
                    if (circle.contractAddress)
                        getStatsPromises.push(cs.getCircleContractStatistics(circle, null));
                    else
                        getStatsPromises.push(getEmptyStats());
                });

                Q.all(getStatsPromises)
                    .then((statsRes) => {
                        var auditItems = Array<IAuditListItem>();

                        // The stats results arrive in an array in the same sequence as the circles 
                        // themselves. Map each stats results to the circle ID.
                        circles.map(function (c, i) {
                            auditItems.push({
                                circle: c,
                                statistics: statsRes[i]
                            });
                        });

                        // Compute totals for all the items.
                        var totals: ICircleStatistics = {
                            availableBalance: 0,
                            memberBalance: undefined,
                            balance: 0,
                            totalActiveLoansAmount: 0,
                            totalDepositsAmount: 0,
                            totalPaidLoansAmount: 0,
                            totalRepaidLoansAmount: 0
                        };

                        for (var k in totals) {
                            totals[k] = _(auditItems).reduce(function (memo, item) {
                                // As some of the items might be undefined, we use "value || 0".
                                return memo + (item.statistics[k] || 0);
                            }, 0);
                        }

                        var list: IAuditList = {
                            items: auditItems,
                            totals: totals
                        };

                        res.send(list);
                    })
                    .catch((statsErr) => {
                        res.status(500).json({
                            "error": statsErr,
                            "error_location": "loading statistics for circles"
                        });
                    });
            },
                function (getCircleErr) {
                    res.status(500).json({
                        "error": getCircleErr,
                        "error_location": "loading circles"
                    });
                });
    }

    getCircleVaultData = (req: express.Request, res: express.Response) => {
        var adminAccount = this.config.bitReserve.circleVaultAccount.userName;
        var t = this;

        // Get global Circle Vault account
        userModel.User.findOne({ externalId: adminAccount }).exec()
            .then((adminUserRes) => {
                // Create BitReserve connector for global admin user.
                var brs = serviceFactory.createBitreserveService(adminUserRes.accessToken);

                // Get the circle vault card.
                brs.getCards((cardsErr, cardsRes) => {
                    if (cardsErr) {
                        res.status(500).json({
                            "error": cardsErr,
                            "error_location": "getting cards"
                        });
                        return;
                    }

                    var vaultCard = _(cardsRes).find((c) => {
                        return c.address.bitcoin == t.config.bitReserve.circleVaultAccount.cardBitcoinAddress;
                    });

                    if (vaultCard == null) {
                        res.status(500).json({
                            "error": "can't find circle vault card",
                            "error_location": "getting circle vault card"
                        });
                        return;
                    }

                    var stats = <ICircleVaultStatistics>{};
                    stats.balance = vaultCard.balance;

                    brs.getCardTransactions(vaultCard.id, (transErr, transactions) => {
                        if (cardsErr) {
                            res.status(500).json({
                                "error": transErr,
                                "error_location": "getting transactions"
                            });
                            return;
                        }

                        // Anonymize the data. The data contains user names because it's executed as an authenticated
                        // user.
                        // Also enhance the data and compute totals.
                        var totalDebit = 0;
                        var totalCredit = 0;

                        _(transactions).each(function (t) {
                            // Mark it as a debit or credit transaction
                            if (t.origin.username == adminAccount) {
                                t["debitcredit"] = "D";
                                t["debitAmount"] = t.origin.amount;
                                totalDebit += parseFloat(t.origin.amount.toString());
                            }
                            else {
                                t["debitcredit"] = "C";
                                t["creditAmount"] = t.destination.amount;
                                totalCredit += parseFloat(t.destination.amount.toString());
                            }

                            t.origin.description = undefined;
                            t.origin.username = undefined;
                            t.destination.description = undefined;
                            t.destination["username"] = undefined;
                        });

                        stats.transactions = transactions;
                        stats.totals = {
                            debitAmount: totalDebit,
                            creditAmount: totalCredit
                        };

                        res.json(stats);

                    });
                });
            }, function (adminUserErr) {
                res.status(500).json({
                    "error": adminUserErr,
                    "error_location": "getting circle vault card"
                });
            });
    }

    getInfo = (req: express.Request, res: express.Response) => {
        var sourceCode: string;

        var t = this;

        web3plus.loadContractSourceCodeFromFile('Circle.sol', function (sourceCodeErr, sourceCode) {
            if (sourceCodeErr) {
                res.status(500).json({
                    "error": sourceCodeErr,
                    "error_location": "loading smart contract source code"
                });
                return;
            }

            // TODO: get real genesis block
            var genesisBlock = {
                "nonce": "0x0000000000000042",
                "difficulty": "0x40000",
                "alloc": {
                },
                "mixhash": "0x0000000000000000000000000000000000000000000000000000000000000000",
                "coinbase": "0x0000000000000000000000000000000000000000",
                "timestamp": "0x00",
                "parentHash": "0x0000000000000000000000000000000000000000000000000000000000000000",
                "extraData": "0x",
                "gasLimit": "0x4c4b40"
            }

            var info: IApplicationInfo = {
                blockchain: {
                    nodeUrl: t.config.ethereum.nodeUrl,
                    smartContractSourceCode: sourceCode,
                    genesisBlock: genesisBlock
                }
            }
            res.json(info);
        });
    }
}