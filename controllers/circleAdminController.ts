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


        userModel.getUserByAccessToken(token, function (userErr, userRes) {
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
                circleData.administrators = [userRes.id];

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
                        // However that will make deposits more complex: when sending a transaction
                        // from a user to the vault account, the user can't specify to which card.
                        // Hence the transaction will arrive on an unspecified card, probably the
                        // default "GBP card". To transfer the incoming transaction to the right
                        // card would require another transaction by the circle vault: from "GBP card"
                        // to the Circle card.
                        // Furthermore the support for ICircle.vaultCardId would have to be incorporated
                        // into loans, repayments (with a similar situation as deposits) and audits.

                        // So for now, don't implement.

                        //brs = new bitReserveService.BitReserveService(vaultUser.accessToken);
                        //brs.createCard("POC - " + circleData.name, function (createCardErr, card) {
                        //    if (createCardErr) {
                        //        res.status(500).json({
                        //            "error": createCardErr,
                        //            "error_location": "creating card for circle",
                        //        });
                        //        return;
                        //    }
                        //    circleData.vaultCardId = card.id;
                            
                        // Store in MongoDB and return.
                        circleModel.Circle.create(circleData, (err, circleRes) => {
                            if (err) {
                                res.status(500).json({
                                    "error": userErr,
                                    "error_location": "saving Circle data",
                                });
                                return;
                            }

                            res.send(circleRes);
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
                circleData.commonBond);
        });

    }
}
