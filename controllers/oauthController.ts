import querystring = require('querystring');
import userModel = require('../models/userModel');
import express = require('express');

interface IOAuthControllerConfig {
    /**
     * Base URL on our side, e.g. https://localhost:3124
     */
    baseUrl: string;

    /**
     * Base path for this oauth controller on our side, e.g. /auth/github
     */
    basePath: string;

    /**
     * URL of the external OAuth site, e.g. 'https://github.com/login'
     */
    oauthSite: string;
    oauthTokenPath: string;
    oauthAuthorizationPath: string;
    clientID: string;
    clientSecret: string;
    scope: string;
}


module.exports = function (configParam: IOAuthControllerConfig) {
    var config: IOAuthControllerConfig;
    var oauth2;
    var authorization_uri;

    config = configParam;

    init(config);

    function init(config: IOAuthControllerConfig) {
        oauth2 = require('simple-oauth2')({
            clientID: config.clientID,
            clientSecret: config.clientSecret,
            site: config.oauthSite,
            tokenPath: config.oauthTokenPath,
            authorizationPath: config.oauthAuthorizationPath,
        });

        // Authorization uri definition
        authorization_uri = oauth2.authCode.authorizeURL({
            redirect_uri: getCallbackUrl(),
            scope: config.scope,
            state: getState()
        });
    }

    /**
     * Gets the route this controller exposes to initiate an authentication request, e.g. /api/auth/bitreserve.
     */
    function getAuthRoute(): string {
        return config.basePath;
    }

    /**
     * Gets the route used for callback calls.
     */
    function getCallbackApiRoute(): string {
        return config.basePath + '/callback';
    }

    /**
 * Gets the route used for callbacks.
 */
    function getCallbackPublicRoute(): string {
        // The callback should be to the world-facing URL (e.g. /auth/bitreserve/callback) and not to 
        // the API (e.g. /api/auth/bitreserve/callback). So strip '/api/'.
        // TODO: allow configuring this specifically, or improve convention so that no string replace has to be done.
        return config.basePath.replace('/api/', '/') + '/callback';
    }


    /**
     * Gets the full callback URL that the OAuth provider has to redirect back to.
     * Example: http://localhost:3124/#/auth/bitreserve/callback
     */
    function getCallbackUrl(): string {
        return config.baseUrl + getCallbackPublicRoute();
    }

    function getState() {
        // TODO: make dynamic, session-specific; check on callback.
        return 'H()OEUHM*$(';
    }

    // Initial page redirecting to Github
    function auth(req, res) {
        res.redirect(authorization_uri);
    };

    // Callback service parsing the authorization token and asking for the access token
    function callback(req: express.Request, res: express.Response) {
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

        // TODO: check state passed in request.
        var state = reqData.state;

        oauth2.authCode.getToken({
            code: code,
            redirect_uri: getCallbackUrl()
        }, saveToken);

        function saveToken(error, result) {
            if (error) {
                console.log('Access Token Error', error.error);
                res.json(500,
                    {
                        "status": "Error",
                        "error_location": "Getting token from OAuth provider",
                        "error": error
                    });
                return;
            }

            if (!result.expires_in)
                result.expires_in = 9999999;
            var token = oauth2.accessToken.create(result);

            var accessToken: string;

            if (token.token.access_token)
                // Cases where the token response is parsed, e.g. BitReserve
                accessToken = token.token.access_token;
            else {
                // Cases where the token response isn't parsed and arrives as a query string (access_token=...&scope=...), e.g. GitHub
                // Parse it here to get the token.
                var parsed = querystring.parse(token.token);
                accessToken = parsed.access_token;
            }

            // TODO: clean up callback hell and duplication. Use Promises (Q library).

            // Get the user from the OAuth provider
            getUserInfo(accessToken, function (err, userInfo) {
                var externalUserID: string;
                var name = "New user";

                if (err) {
                    // TODO: handle error
                } else if (userInfo) {
                    name = userInfo.name;
                    externalUserID = userInfo.externalID;
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
                userModel.repository.findOne({ externalID: externalUserID }, function (err, user) {

                    // TODO: use promise to wait for creating new user.
                    if (!user) {
                        // User didn't exist yet
                        userModel.repository.create({
                            name: name,
                            externalID: externalUserID,
                            accessToken: accessToken,
                        }, function (userErr, userRes) {
                            // Handle result                    
                            res.json({
                                "status": "Ok",
                                "user": userRes,
                            });
                        });
                    }
                    else {
                        // Store the token
                        user.accessToken = accessToken;

                        // Save it
                        userModel.repository.update({ name: user.name }, user, function (saveErr, affectedRows, raw) {
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
                                });
                            }
                        });

                    }
                });

            });
        }
    }

    /**
     * The function used to get user info from the oauth service.
     */
    var getUserInfoFunction = getUserInfoStub;

    /** 
     * Set the function used to get the user info from the oauth service.
     */
    function setGetUserInfoFunction(f) {
        getUserInfoFunction = f;
    }

    function getUserInfo(authorizationCode: string, callback) {
        getUserInfoFunction(authorizationCode, function (err, user) {
            callback(err, user);
        });
    }

    function getUserInfoStub(authorizationCode: string, callback) {
        callback(null, null);
    };


    /**
     * Get information about the current user in the form {name:'..', externalID:'..'}. To be overridden by implementors.
     */
    function getUserInfoInternal(authorizationCode: string, callback) {
        callback(null, null);
    }

    // Only the functions below are exposed to callers.
    return {
        'auth': auth,
        'callback': callback,
        'getCallbackApiRoute': getCallbackApiRoute,
        'getCallbackPublicRoute': getCallbackPublicRoute,
        'getAuthRoute': getAuthRoute,
        'setGetUserInfoFunction': setGetUserInfoFunction,
        'getUserInfo': getUserInfo,
    }
}