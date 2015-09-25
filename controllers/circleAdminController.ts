import express = require("express");
import circleModel = require('../models/circleModel');
import userModel = require('../models/userModel');
import web3plus = require('../node_modules/web3plus/lib/web3plus');

/**
 * Controller for Circle admin operations.
 */
export class CircleAdminController {
    /**
     * Create a new Circle.
     */
    create(req: express.Request, res: express.Response) {
        var token = req.header("AccessToken");
        var circleData = req.body;

        // Creating a Circle goes in two steps:
        // 1. Create the smart contract
        // 2. Store the circle in MongoDB
        // If step 1 would fail for whatever reason, no data is stored anywhere,
        // which is good.
        // If step 2 fails, we would end up with an orphan contract. That's not
        // too bad; this "circle" will never show up anywhere.

        userModel.getUserByAccessToken(token, function(userErr, userRes) {
            var afterDeploy = (contractErr, circleContract) => {
                if (contractErr) {
                    circleContract.status(500).json({
                        "error": contractErr,
                        "error_location": "creating smart contract for circle",
                        "status": "Error",
                    });
                } else {
                    circleData.contractAddress = circleContract.address;

                    // Add the current user as the first admin.
                    circleData.administrators = [userRes._id];

                    // Store in MongoDB and return.
                    circleModel.Circle.create(circleData, (err, circleRes) => {
                        if (err) {
                            res.status(500).json({
                                "error": userErr,
                                "error_location": "saving Circle data",
                                "status": "Error",
                            });
                        } else {
                            res.send(circleRes);
                        }
                    });
                }
            }

            if (userErr) {
                res.status(500).json({
                    "error": userErr,
                    "error_location": "getting user data",
                    "status": "Error",
                });
            } else {
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
            }
        });

    }
}
