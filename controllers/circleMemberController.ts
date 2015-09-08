import express = require("express");
import circleModel = require('../models/circleModel');
import userModel = require('../models/userModel');

/**
 * Controller for Circle membership operations.
 */
export class CircleMemberController {
    getAll(req: express.Request, res: express.Response) {
        var token = req.header("AccessToken");

        circleModel.Circle.find({}, (err, circleRes) => {
            res.send(circleRes);
        });
    }

    getOne(req: express.Request, res: express.Response) {
        var token = req.header("AccessToken");

        circleModel.Circle.findOne({ _id: req.params.id }, (err, circleRes) => {
            res.send(circleRes);
        });
    }

    join(req: express.Request, res: express.Response) {
        var token = req.header("AccessToken");

        var circleData = <circleModel.ICircle>req.body;

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
                        // TODO: use ObjectID for circleID (and Mongoose populate())
                        return value.circleId === circleData._id.toString() && !value.endDate;
                    })) {
                    res.status(500).json({
                        "error": "User is already a member of this circle",
                        "error_location": "joining circle",
                        "status": "Error",
                    });
                } else {
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
                }
            }
        });
    }

    deposit(req: express.Request, res: express.Response) {
        var token = req.header("AccessToken");

        var circleId = req.params.id;
        var depositData = req.body;

        // TODO
        // Create transaction
        // Amount
        // Denomination
        // To: admin account

        res.json({ "status": "ok" });
    }
}