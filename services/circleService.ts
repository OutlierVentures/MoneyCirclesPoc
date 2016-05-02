import request = require('request');
import userModel = require('../models/userModel');
import web3plus = require('../node_modules/web3plus/lib/web3plus');
import circleModel = require('../models/circleModel');
import mongoose = require('mongoose');
import Q = require('q');

interface IBigNumber {
    toNumber(): number
}

export class CircleService {
    constructor(
        private authorizationToken: string) {
    }

    /**
     * Get statistics for a Circle.
     */
    getCircleStatistics(circleId: string): Q.Promise<ICircleStatistics> {
        var deferred = Q.defer<ICircleStatistics>();

        var t = this;

        var circlePromise = Q(circleModel.Circle.findOne({ _id: circleId }).exec());

        var promises = new Array<Q.Promise<mongoose.Document>>();
        promises.push(circlePromise);

        if (this.authorizationToken) {
            var getUserByToken = Q.denodeify<userModel.IUser>(userModel.getUserByAccessToken);
            promises.push(getUserByToken(this.authorizationToken));
        }

        Q.all(promises)
            .then(function addStats(results) {
                var user: userModel.IUser;
                var circle: circleModel.ICircle;

                circle = <circleModel.ICircle>results[0];

                if (results.length == 2)
                    user = <userModel.IUser>results[1];

                return t.getCircleContractStatistics(circle, user);
            })
            .then((stats) => {
                deferred.resolve(stats);
            })
            .catch(function (err) {
                deferred.reject(err);
            });

        return deferred.promise;
    }

    getCircleContractStatistics(circle: circleModel.ICircle, user: userModel.IUser): Q.Promise<ICircleStatistics> {
        var deferred = Q.defer<ICircleStatistics>();

        // Load the circle contract to get balances
        console.log("Before loading contract:" + Date());
        var circleContract = web3plus.loadContractFromFile('Circle.sol', 'Circle', circle.contractAddress, true, function (loadContractError, circleContract) {
            console.log("After loading contract:" + Date());

            if (loadContractError) {
                deferred.reject(loadContractError);
            } else {
                var getNumberPromises = new Array<Q.Promise<IBigNumber>>(
                    Q.denodeify<IBigNumber>(circleContract.getAvailableBalance)(),
                    Q.denodeify<IBigNumber>(circleContract.getBalance)(),
                    Q.denodeify<IBigNumber>(circleContract.getTotalActiveLoansAmount)(),
                    Q.denodeify<IBigNumber>(circleContract.getTotalPaidLoansAmount)(),
                    Q.denodeify<IBigNumber>(circleContract.getTotalRepaidLoansAmount)(),
                    Q.denodeify<IBigNumber>(circleContract.getTotalDepositsAmount)(),
                    Q.denodeify<IBigNumber>(circleContract.getTotalRepaidInterestAmount)()
                    );

                if (user)
                    getNumberPromises.push(Q.denodeify<IBigNumber>(circleContract.getMemberBalance)(user));

                function normalizeBigNumber(n: IBigNumber) {
                    return n.toNumber() / 100;
                }

                Q.all(getNumberPromises)
                    .then(function (numberResults) {
                        var normalizedResults = numberResults.map(normalizeBigNumber);

                        var statistics = {
                            availableBalance: normalizedResults[0],
                            balance: normalizedResults[1],
                            totalActiveLoansAmount: normalizedResults[2],
                            totalPaidLoansAmount: normalizedResults[3],
                            totalRepaidLoansAmount: normalizedResults[4],
                            totalDepositsAmount: normalizedResults[5],
                            totalRepaidInterestAmount: normalizedResults[6],
                            memberBalance: undefined,
                        };
                        if (numberResults.length > 6)
                            statistics.memberBalance = normalizedResults[7];

                        deferred.resolve(statistics);
                        console.log("After calling contract methods:" + Date());
                    })
                    .catch(function (err) {
                        deferred.reject(err);
                    });
            }
        });

        return deferred.promise;
    }
}