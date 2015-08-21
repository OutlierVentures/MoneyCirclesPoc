import querystring = require('querystring');
import userModel = require('../models/userModel');

/**
 * Base URL on our side, e.g. https://localhost:3124
 */
export var baseUrl: string;

/**
 * Base path for this oauth controller on our side, e.g. /auth/github
 */
export var basePath: string;

/**
 * URL of the external OAuth site, e.g. 'https://github.com/login'
 */
export var oauthSite: string;
export var oauthTokenPath: string;
export var oauthAuthorizationPath: string;
export var clientID: string;
export var clientSecret: string;
export var scope = 'notifications';

var oauth2;
var authorization_uri;

export function init() {
    oauth2 = require('simple-oauth2')({
        clientID: clientID,
        clientSecret: clientSecret,
        site: oauthSite,
        tokenPath: oauthTokenPath,
        authorizationPath: oauthAuthorizationPath,
    });

    // Authorization uri definition
    authorization_uri = oauth2.authCode.authorizeURL({
        redirect_uri: getCallbackPath(),
        scope: scope,
        state: getState()
    });

}

export function getAuthRoute(): string {
    return basePath;
}

export function getCallbackRoute(): string {
    return basePath + '/callback';
}

function getCallbackPath(): string {
    return baseUrl + getCallbackRoute();
}

function getState() {
    // TODO: make dynamic, session-specific; check on callback.
    return '3(#0/!~';
}

// Initial page redirecting to Github
export function auth(req, res) {
    res.redirect(authorization_uri);
};

// Callback service parsing the authorization token and asking for the access token
export function callback(req, res) {
    if (req.query.error) {
        res.send("Error returned by OAuth provider on callback: " + req.query.error);
    }

    var code = req.query.code;

    // TODO: check state passed in request.
    var state = req.query.state;

    oauth2.authCode.getToken({
        code: code,
        redirect_uri: getCallbackPath()
    }, saveToken);

    function saveToken(error, result) {
        if (error) {
            console.log('Access Token Error', error.error);
            res.send("Error while getting token: " + error.error);
            return;
        }
        
        if (!result.expires_in)
            result.expires_in = 9999999;
        var token = oauth2.accessToken.create(result);

        var accessToken: string;

        if (token.token.access_token)
            // BitReserve
            accessToken = token.token.access_token;
        else {
            // GitHub
            var parsed = querystring.parse(token.token);
            accessToken = parsed.access_token;
        }

        // Get the user from the OAuth provider
        var externalUserID = '123';
        
        // Get the user from our side, or create it.
        userModel.repository.findOne({ externalID: externalUserID }, function (err, user) {
            // TODO: use promise to wait for creating new user.
            if (!user) {
                // User didn't exist yet
                userModel.repository.create({
                    name: "New user",
                    externalID: externalUserID,
                    accessToken: accessToken,
                }, function (userErr, userRes) {
                    // Handle result                    
                    res.send("Welcome, new user " + userRes.name + "!");
                });
            }
            else {
                // Store the token
                user.accessToken = accessToken;

                // Save it
                userModel.repository.update({ name: user.name }, user, function (saveErr, affectedRows, raw) {
                    if (saveErr) {
                        res.send("Something went wrong when storing your data :(");
                    } else {
                        res.send("Welcome back, user " + user.name + "!");
                    }
                });
            }
        });

    }
};