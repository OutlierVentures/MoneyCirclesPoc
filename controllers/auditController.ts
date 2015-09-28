import express = require("express");
import circleModel = require('../models/circleModel');
import userModel = require('../models/userModel');
import depositModel = require('../models/depositModel');
import loanModel = require('../models/loanModel');
import circleService = require('../services/circleService');
import web3plus = require('../node_modules/web3plus/lib/web3plus');
import _ = require('underscore');
import Q = require('q');

interface IAuditList {
    [circleId: string]:
    {
        circle: circleModel.ICircle,
        statistics: ICircleStatistics,
    }
}

interface IAuditDetails {
    circle: circleModel.ICircle,
    statistics: ICircleStatistics,
    loans: [loanModel.ILoan],
    deposits: [depositModel.IDeposit]
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
                        var auditList: IAuditList = {};

                        // The stats results arrive in an array in the same sequence as the circles 
                        // themselves. Map each stats results to the circle ID.
                        circles.map(function (c, i) {
                            auditList[c.id] = {
                                circle: c,
                                statistics: statsRes[i]
                            };
                        });

                        res.send(auditList);
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
}