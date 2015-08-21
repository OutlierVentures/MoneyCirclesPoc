var querystring = require('querystring');
var userModel = require('../models/userModel');
/**
 * Base URL on our side, e.g. https://localhost:3124
 */
exports.baseUrl;
/**
 * Base path for this oauth controller on our side, e.g. /auth/github
 */
exports.basePath;
/**
 * URL of the external OAuth site, e.g. 'https://github.com/login'
 */
exports.oauthSite;
exports.oauthTokenPath;
exports.oauthAuthorizationPath;
exports.clientID;
exports.clientSecret;
exports.scope = 'notifications';
var oauth2;
var authorization_uri;
function init() {
    oauth2 = require('simple-oauth2')({
        clientID: exports.clientID,
        clientSecret: exports.clientSecret,
        site: exports.oauthSite,
        tokenPath: exports.oauthTokenPath,
        authorizationPath: exports.oauthAuthorizationPath,
    });
    // Authorization uri definition
    authorization_uri = oauth2.authCode.authorizeURL({
        redirect_uri: getCallbackPath(),
        scope: exports.scope,
        state: getState()
    });
}
exports.init = init;
function getAuthRoute() {
    return exports.basePath;
}
exports.getAuthRoute = getAuthRoute;
function getCallbackRoute() {
    return exports.basePath + '/callback';
}
exports.getCallbackRoute = getCallbackRoute;
function getCallbackPath() {
    return exports.baseUrl + getCallbackRoute();
}
function getState() {
    // TODO: make dynamic, session-specific; check on callback.
    return '3(#0/!~';
}
// Initial page redirecting to Github
function auth(req, res) {
    res.redirect(authorization_uri);
}
exports.auth = auth;
;
// Callback service parsing the authorization token and asking for the access token
function callback(req, res) {
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
        var accessToken;
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
                    }
                    else {
                        res.send("Welcome back, user " + user.name + "!");
                    }
                });
            }
        });
    }
}
exports.callback = callback;
;
//# sourceMappingURL=oauthController.js.map