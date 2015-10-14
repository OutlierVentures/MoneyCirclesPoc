import express = require("express");
import circleModel = require('../models/circleModel');
import userModel = require('../models/userModel');
import bitReserveService = require('../services/bitReserveService');
import web3plus = require('../node_modules/web3plus/lib/web3plus');
import Q = require('q');

/**
 * Controller for Circle admin operations.
 */
export class CircleAdminController {
    private config: IApplicationConfig;

    constructor(configParam: IApplicationConfig) {
        this.config = configParam;
    }

    /**
     * Create a new Circle.
     */
    create = (req: express.Request, res: express.Response) => {
        var token = req.header("AccessToken");
        var circleData = <circleModel.ICircle>req.body;

        var vaultUsername = this.config.bitReserve.circleVaultAccount.userName;

        // Creating a Circle goes in two steps:
        // 1. Create the smart contract
        // 2. Store the circle in MongoDB
        // If step 1 would fail for whatever reason, no data is stored anywhere,
        // which is good.
        // If step 2 fails, we would end up with an orphan contract. That's not
        // too bad; this "circle" will never show up anywhere.


        userModel.getUserByAccessToken(token, function (userErr, user) {
            var afterDeploy = (contractErr, circleContract) => {
                if (contractErr) {
                    circleContract.status(500).json({
                        "error": contractErr,
                        "error_location": "creating smart contract for circle",
                    });
                    return;
                }

                circleData.contractAddress = circleContract.address;

                // Add the current user as the first admin.
                circleData.administrators = [user.id];

                // TODO: let the user join the Circle here. The user is now an administrator,
                // but not a member.

                var brs: bitReserveService.BitReserveService;
                var vaultUser: userModel.IUser;

                // Get global Circle Vault account
                userModel.User.findOne({ externalId: vaultUsername }).exec()
                    .then((vu) => {
                        vaultUser = vu;
                    }, (vaultUserErr) => {
                        circleContract.status(500).json({
                            "error": vaultUserErr,
                            "error_location": "getting Circle vault account",
                        });
                    })
                    .then(() => {
                        // Ideally we would create a separate card in the circle vault account
                        // for the new Circle here. This can be done using the code below. 
                        // Each Circle then gets its own bitcoin address which can be used for 
                        // transfers to the vault. For transfers out we use the cardId.                        
                        // COULD DO: implement, here and in all transfers, audit page.

                        //brs = new bitReserveService.BitReserveService(vaultUser.accessToken);
                        //brs.createCard("POC - " + circleData.name, function (createCardErr, card) {
                        //    if (createCardErr) {
                        //        res.status(500).json({
                        //            "error": createCardErr,
                        //            "error_location": "creating card for circle",
                        //        });
                        //        return;
                        //    }
                        //    circleData.cardId = card.id;
                        //    circleData.cardBitcoinAddress = card.address.bitcoin;
                            
                        // Store in MongoDB and return.
                        circleModel.Circle.create(circleData, (err, circle) => {
                            if (err) {
                                res.status(500).json({
                                    "error": userErr,
                                    "error_location": "saving Circle data",
                                });
                                return;
                            }

                            // Always add the creator as a member.
                            // TODO: remove duplication with circleMemberController.join()
                            // TOOD: remove duplication between MongoDB and the contract. Use the contract.
                            // 1. Store in the contract
                            circleContract.addMember(user._id.toString(), user.externalId, { gas: 2500000 })
                                .then(web3plus.promiseCommital)
                                .then(function (tx) {
                                    // 2. Register in MongoDB

                                    var cm = new userModel.CircleMembership();
                                    cm.circleId = circle.id;
                                    cm.startDate = new Date();
                                    user.circleMemberships.push(cm);

                                    user.save(function (saveErr, saveRes) {
                                        if (saveErr) {
                                            res.status(500).json({
                                                "error": saveErr,
                                                "error_location": "saving user data",
                                                "status": "Error",
                                            });
                                            return;
                                        }

                                        res.send(circle);
                                    });

                                })
                                .catch(function (addMemberError) {
                                    res.status(500).json({
                                        "error": addMemberError,
                                        "error_location": "adding user to Circle members data",
                                    });
                                    return;
                                });

                        });

                    });

            }

            if (userErr) {
                res.status(500).json({
                    "error": userErr,
                    "error_location": "getting user data",
                    "status": "Error",
                });
                return;

            }

            // Create circle contract.

            // TODO: make this step asynchronous to the client as it takes
            // a long time. This will
            // require a facility to report back to the user that circle
            // creation has been completed.
            web3plus.deployContractFromFile("Circle.sol",
                "Circle",
                true,
                afterDeploy,
                circleData.name,
                circleData.commonBond,
                circleData.interestPercentage * 100);
        });

    }
}
