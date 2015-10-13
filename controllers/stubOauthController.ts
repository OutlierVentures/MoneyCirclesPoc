﻿import querystring = require('querystring');
import userModel = require('../models/userModel');
import express = require('express');
import oc = require('oauthController');

export class StubOAuthController {
    
    constructor(private oauthController: oc.OAuthController) {
     
    }


    /**
     * Redirect to the authorization URL of the OAuth provider
     */
    auth = (req: express.Request, res: express.Response) => {
        res.redirect(this.oauthController.getCallbackPublicRoute() + "?code=12345");
    };
    
    /**
     * Callback operation parsing the authorization token and asking for the access token from
     * the OAuth provider.
     */
    callback = (req: express.Request, res: express.Response) => {
        var reqData = req.body;

        if (reqData.error) {
            // The function was called with error data. Don't process any further.
            res.json(400,
                {
                    "status": "Error",
                    "error": "Error returned by OAuth provider on callback: " + reqData.error
                });
        }

        var code = reqData.code;

        var t = this;

        var randomToken = "stubToken" + Math.random() * 100000;

        saveToken(randomToken);

        // TODO: reuse function from real oauthController. Now code is duplicated.

        /**
         * Callback for saving the token from the OAuth provider and returning the result.
         */
        function saveToken(accessToken:string) {
            // Get the user from the OAuth provider
            t.oauthController.getUserInfoFunction(accessToken, function (err, userInfo: IUser) {
                var externalUserId: string;
                var name = "New user";
                var email: string;

                if (err) {
                    res.json(
                        500,
                        {
                            "error": err,
                            "error_location": "getting user data",
                            "status": "Error"
                        });;
                } else if (userInfo) {
                    name = userInfo.name;
                    externalUserId = userInfo.externalId;
                    email = userInfo.email;
                } else {
                    res.json(
                        500,
                        {
                            "error": "User info is empty",
                            "error_location": "getting user data",
                            "status": "Error"
                        });;
                }
        
                // Get the user from our side, or create it.
                // If the MongoDB connection fails, this call times out and the result is never sent.
                // TODO: handle that.
                userModel.User.findOne({ externalId: externalUserId }, function (err, user) {

                    // TODO: use promise to wait for creating new user.
                    if (!user) {
                        // User didn't exist yet
                        userModel.User.create({
                            name: name,
                            externalId: externalUserId,
                            email: email,
                            accessToken: accessToken,
                        }, function (userErr, userRes) {
                            // Handle result                    
                            res.json({
                                "status": "Ok",
                                "user": userRes,
                                "isGlobalAdmin": userRes.externalId === t.oauthController.config.adminUserId
                            });
                        });
                    }
                    else {
                        // Store the token
                        user.accessToken = accessToken;
                        user.email = email;

                        // Save it
                        userModel.User.update({ _id: user._id }, user, function (saveErr, affectedRows, raw) {
                            if (saveErr) {
                                res.json(
                                    500,
                                    {
                                        "error": saveErr,
                                        "error_location": "saving user data",
                                        "status": "Error",
                                        "user": user,
                                    });;
                            } else {
                                res.json({
                                    "status": "Ok",
                                    "user": user,
                                    "isGlobalAdmin": user.externalId === t.oauthController.config.adminUserId
                                });
                            }
                        });

                    }
                });

            });
        }
    }
}